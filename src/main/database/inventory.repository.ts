import { randomUUID } from 'node:crypto'
import type { InventoryAdjustmentInput, InventoryItemDto, InventoryItemInput, InventorySettingsInput, RawMaterialCategoryDto, RawMaterialCategoryInput } from '../../shared/contracts'
import { getSqlite } from './client'

interface InventoryRow extends Omit<InventoryItemDto, 'active' | 'packageEnabled' | 'suppliers'> { active: number; packageEnabled: number }

function replaceItemSuppliers(itemId: string, supplierIds: string[]): void {
  const database = getSqlite()
  database.prepare('DELETE FROM inventory_item_suppliers WHERE inventory_item_id=?').run(itemId)
  const insert = database.prepare('INSERT OR IGNORE INTO inventory_item_suppliers (inventory_item_id,supplier_id) VALUES (?,?)')
  for (const supplierId of [...new Set(supplierIds)]) insert.run(itemId, supplierId)
}

export function listInventoryItems(): InventoryItemDto[] {
  const rows = getSqlite().prepare(`
    SELECT i.id, i.name, i.sku, i.unit, i.quantity, i.low_stock_threshold lowStockThreshold,
      i.purchase_cost purchaseCost, i.supplier_id supplierId, s.company_name supplierName,
      i.barcode, i.item_kind itemKind,
      i.reorder_point reorderPoint, i.minimum_order_quantity minimumOrderQuantity,
      i.catalog_service_id catalogServiceId, COALESCE(ic.id, c.id) categoryId,
      COALESCE(ic.name_ar, c.name_ar) categoryName,
      i.raw_material_category_id rawMaterialCategoryId, rmc.name_ar rawMaterialCategoryName,
      i.package_enabled packageEnabled,
      i.package_name packageName, i.units_per_package unitsPerPackage, i.package_price packagePrice,
      i.package_notes packageNotes, i.reorder_package_count reorderPackageCount,
      i.active, i.updated_at updatedAt
    FROM inventory_items i
    LEFT JOIN suppliers s ON s.id=i.supplier_id
    LEFT JOIN services cs ON cs.id=i.catalog_service_id
    LEFT JOIN service_categories c ON c.id=cs.category_id
    LEFT JOIN service_categories ic ON ic.id=i.category_id
    LEFT JOIN raw_material_categories rmc ON rmc.id=i.raw_material_category_id
    WHERE i.active = 1 ORDER BY i.name
  `).all() as InventoryRow[]
  const supplierRows = getSqlite().prepare(`SELECT l.inventory_item_id inventoryItemId, s.id, s.name, s.company_name companyName, s.whatsapp_phone whatsappPhone
    FROM inventory_item_suppliers l JOIN suppliers s ON s.id=l.supplier_id WHERE s.active=1 ORDER BY s.company_name`).all() as Array<{inventoryItemId:string;id:string;name:string;companyName:string;whatsappPhone:string}>
  const suppliersByItem = new Map<string, InventoryItemDto['suppliers']>()
  for (const supplier of supplierRows) { const list=suppliersByItem.get(supplier.inventoryItemId) ?? []; list.push({id:supplier.id,name:supplier.name,companyName:supplier.companyName,whatsappPhone:supplier.whatsappPhone}); suppliersByItem.set(supplier.inventoryItemId,list) }
  return rows.map((row) => ({ ...row, suppliers: suppliersByItem.get(row.id) ?? [], active: Boolean(row.active), packageEnabled: Boolean(row.packageEnabled) }))
}

export function listRawMaterialCategories(): RawMaterialCategoryDto[] {
  const rows=getSqlite().prepare('SELECT id,name_ar nameAr,active,sort_order sortOrder FROM raw_material_categories WHERE active=1 ORDER BY sort_order,name_ar').all() as Array<Omit<RawMaterialCategoryDto,'active'>&{active:number}>
  return rows.map((row)=>({...row,active:Boolean(row.active)}))
}

export function saveRawMaterialCategory(input: RawMaterialCategoryInput): RawMaterialCategoryDto {
  const database=getSqlite()
  const duplicate=database.prepare("SELECT id,active FROM raw_material_categories WHERE lower(name_ar)=lower(?) AND id<>COALESCE(?, '')").get(input.nameAr,input.id??null) as {id:string;active:number}|undefined
  if(duplicate?.active) throw new Error('يوجد تصنيف مواد خام بهذا الاسم بالفعل.')
  if(input.id){ const result=database.prepare('UPDATE raw_material_categories SET name_ar=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND active=1').run(input.nameAr,input.id); if(!result.changes) throw new Error('التصنيف المطلوب غير موجود.') }
  else if(duplicate) database.prepare('UPDATE raw_material_categories SET name_ar=?,active=1,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(input.nameAr,duplicate.id)
  else { const id=randomUUID(),sortOrder=Number(database.prepare('SELECT COALESCE(MAX(sort_order),0)+10 FROM raw_material_categories').pluck().get()); database.prepare('INSERT INTO raw_material_categories (id,name_ar,active,sort_order) VALUES (?,?,1,?)').run(id,input.nameAr,sortOrder); input={...input,id} }
  const id=input.id??duplicate?.id
  const saved=listRawMaterialCategories().find((category)=>category.id===id)
  if(!saved) throw new Error('تعذر قراءة التصنيف بعد حفظه.')
  return saved
}

export function deleteRawMaterialCategory(id: string): void {
  const database=getSqlite()
  database.transaction(()=>{ const result=database.prepare('UPDATE raw_material_categories SET active=0,updated_at=CURRENT_TIMESTAMP WHERE id=? AND active=1').run(id); if(!result.changes) throw new Error('التصنيف المطلوب غير موجود.'); database.prepare('UPDATE inventory_items SET raw_material_category_id=NULL,updated_at=CURRENT_TIMESTAMP WHERE raw_material_category_id=?').run(id) })()
}

export function getInventoryItem(id: string): InventoryItemDto | undefined {
  return listInventoryItems().find((item) => item.id === id)
}

export function adjustInventory(input: InventoryAdjustmentInput): InventoryItemDto {
  const database = getSqlite()
  database.transaction(() => {
    const current = database.prepare(`SELECT quantity, package_enabled packageEnabled, units_per_package unitsPerPackage FROM inventory_items WHERE id = ? AND active = 1`).get(input.itemId) as { quantity: number; packageEnabled: number; unitsPerPackage: number | null } | undefined
    if (!current) throw new Error('عنصر المخزون غير موجود.')
    const adjustedQuantity = input.type === 'ADD' && input.quantityMode === 'PACKAGE' && current.packageEnabled && current.unitsPerPackage
      ? input.quantity * current.unitsPerPackage
      : input.quantity
    const delta = input.type === 'ADD' ? adjustedQuantity : -adjustedQuantity
    const next = current.quantity + delta
    if (next < 0) throw new Error('لا يمكن سحب كمية أكبر من الرصيد الحالي.')
    database.prepare(`UPDATE inventory_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(next, input.itemId)
    database.prepare(`INSERT INTO inventory_transactions (id, inventory_item_id, type, quantity, notes, occurred_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(randomUUID(), input.itemId, input.type === 'ADD' ? 'IN' : 'OUT', adjustedQuantity, input.notes, new Date().toISOString())
  })()
  const saved = getInventoryItem(input.itemId)
  if (!saved) throw new Error('تعذر تحديث المخزون.')
  return saved
}

export function updateInventorySettings(input: InventorySettingsInput): InventoryItemDto {
  const database = getSqlite()
  database.transaction(() => {
    const result = database.prepare(`UPDATE inventory_items SET name=COALESCE(?,name), low_stock_threshold=?, purchase_cost=?, supplier_id=?, barcode=COALESCE(?,barcode), raw_material_category_id=COALESCE(?,raw_material_category_id), reorder_point=?, minimum_order_quantity=?, package_enabled=?, package_name=?, units_per_package=?, package_price=?, package_notes=?, reorder_package_count=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND active=1`)
      .run(input.name, input.lowStockThreshold, input.purchaseCost, input.supplierId, input.barcode ?? null, input.rawMaterialCategoryId ?? null, input.reorderPoint, input.minimumOrderQuantity, input.packageEnabled ? 1 : 0, input.packageName, input.unitsPerPackage, input.packagePrice, input.packageNotes, input.reorderPackageCount, input.itemId)
    if (result.changes === 0) throw new Error('عنصر المخزون غير موجود.')
    replaceItemSuppliers(input.itemId, input.supplierIds ?? (input.supplierId ? [input.supplierId] : []))
  })()
  const saved = getInventoryItem(input.itemId)
  if (!saved) throw new Error('تعذر حفظ إعدادات المخزون.')
  return saved
}

export function createInventoryItem(input: InventoryItemInput): InventoryItemDto {
  const database=getSqlite(),id=randomUUID(),isRaw=input.itemKind==='RAW_MATERIAL',serviceId=isRaw?null:`inventory-catalog-${id}`,serviceCode=`STOCK_${id.replace(/-/g,'').slice(0,16).toUpperCase()}`,supplierId=input.supplierIds?.[0] ?? input.supplierId ?? null
  database.transaction(()=>{
    if(serviceId) database.prepare(`INSERT INTO services (id,category_id,code,name_ar,name_he,material_type,size,color_mode,coverage,unit,item_type,supplier_id,reorder_point,minimum_order_quantity,cost_type,unit_cost,cost_batch_size,cost_calculation,sale_calculation,active,notes)
      VALUES (?,?,?, ?,NULL,NULL,NULL,NULL,NULL,?,'PRODUCT',?,?,?,'PER_UNIT',?,NULL,'COST_STRATEGY','PRICING_RULE',1,'منتج موحّد مع المخزون.')`)
      .run(serviceId,input.categoryId ?? null,serviceCode,input.name,input.unit,supplierId,input.reorderPoint,input.minimumOrderQuantity,input.purchaseCost)
    database.prepare(`INSERT INTO inventory_items (id, name, sku, barcode, item_kind, unit, quantity, low_stock_threshold, purchase_cost, supplier_id, reorder_point, minimum_order_quantity, category_id, raw_material_category_id, catalog_service_id, package_enabled, package_name, units_per_package, package_price, package_notes, reorder_package_count, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`).run(id, input.name, input.sku, input.barcode ?? null, input.itemKind ?? 'STOCK_ITEM', input.unit, input.quantity, input.reorderPoint, input.purchaseCost, supplierId, input.reorderPoint, input.minimumOrderQuantity, input.categoryId ?? null, input.rawMaterialCategoryId ?? null, serviceId, input.packageEnabled ? 1 : 0, input.packageName, input.unitsPerPackage, input.packagePrice, input.packageNotes, input.reorderPackageCount)
    replaceItemSuppliers(id,input.supplierIds ?? (supplierId ? [supplierId] : []))
  })()
  return getInventoryItem(id)!
}

export function deleteInventoryItem(id: string): void {
  const database = getSqlite()
  database.transaction(() => {
    const item = database.prepare('SELECT id, catalog_service_id catalogServiceId FROM inventory_items WHERE id=? AND active=1').get(id) as { id: string; catalogServiceId: string | null } | undefined
    if (!item) throw new Error('منتج المخزون المطلوب غير موجود.')
    const recipeCount = Number(database.prepare('SELECT COUNT(*) FROM service_material_requirements WHERE inventory_item_id=?').pluck().get(id))
    if (recipeCount > 0) throw new Error('لا يمكن حذف هذه المادة لأنها مستخدمة في وصفة خدمة. احذفها من وصفات الخدمات أولاً.')

    database.prepare('DELETE FROM purchase_requests WHERE inventory_item_id=?').run(id)
    if (item.catalogServiceId) {
      database.prepare('UPDATE services SET active=0, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(item.catalogServiceId)
    }
    const result = database.prepare(`UPDATE inventory_items
      SET active=0, supplier_id=NULL, updated_at=CURRENT_TIMESTAMP
      WHERE id=? AND active=1`).run(id)
    if (result.changes === 0) throw new Error('تعذر حذف منتج المخزون.')
  })()
}
