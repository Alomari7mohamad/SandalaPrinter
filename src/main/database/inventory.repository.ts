import { randomUUID } from 'node:crypto'
import type { InventoryAdjustmentInput, InventoryItemDto, InventoryItemInput, InventorySettingsInput } from '../../shared/contracts'
import { getSqlite } from './client'

interface InventoryRow extends Omit<InventoryItemDto, 'active' | 'packageEnabled'> { active: number; packageEnabled: number }

export function listInventoryItems(): InventoryItemDto[] {
  const rows = getSqlite().prepare(`
    SELECT i.id, i.name, i.sku, i.unit, i.quantity, i.low_stock_threshold lowStockThreshold,
      i.purchase_cost purchaseCost, i.supplier_id supplierId, s.company_name supplierName,
      i.reorder_point reorderPoint, i.minimum_order_quantity minimumOrderQuantity,
      i.catalog_service_id catalogServiceId, c.id categoryId, c.name_ar categoryName,
      i.package_enabled packageEnabled,
      i.package_name packageName, i.units_per_package unitsPerPackage, i.package_price packagePrice,
      i.package_notes packageNotes, i.reorder_package_count reorderPackageCount,
      i.active, i.updated_at updatedAt
    FROM inventory_items i
    LEFT JOIN suppliers s ON s.id=i.supplier_id
    LEFT JOIN services cs ON cs.id=i.catalog_service_id
    LEFT JOIN service_categories c ON c.id=cs.category_id
    WHERE i.active = 1 ORDER BY i.name
  `).all() as InventoryRow[]
  return rows.map((row) => ({ ...row, active: Boolean(row.active), packageEnabled: Boolean(row.packageEnabled) }))
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
  const result = database.prepare(`UPDATE inventory_items SET low_stock_threshold=?, purchase_cost=?, supplier_id=?, reorder_point=?, minimum_order_quantity=?, package_enabled=?, package_name=?, units_per_package=?, package_price=?, package_notes=?, reorder_package_count=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND active=1`)
    .run(input.lowStockThreshold, input.purchaseCost, input.supplierId, input.reorderPoint, input.minimumOrderQuantity, input.packageEnabled ? 1 : 0, input.packageName, input.unitsPerPackage, input.packagePrice, input.packageNotes, input.reorderPackageCount, input.itemId)
  if (result.changes === 0) throw new Error('عنصر المخزون غير موجود.')
  database.prepare(`UPDATE services SET unit_cost=?, supplier_id=?, reorder_point=?, minimum_order_quantity=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=(SELECT catalog_service_id FROM inventory_items WHERE id=?)`)
    .run(input.purchaseCost, input.supplierId, input.reorderPoint, input.minimumOrderQuantity, input.itemId)
  const saved = getInventoryItem(input.itemId)
  if (!saved) throw new Error('تعذر حفظ إعدادات المخزون.')
  return saved
}

export function createInventoryItem(input: InventoryItemInput): InventoryItemDto {
  const id=randomUUID()
  getSqlite().prepare(`INSERT INTO inventory_items (id, name, sku, unit, quantity, low_stock_threshold, purchase_cost, supplier_id, reorder_point, minimum_order_quantity, package_enabled, package_name, units_per_package, package_price, package_notes, reorder_package_count, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`).run(id, input.name, input.sku, input.unit, input.quantity, input.reorderPoint, input.purchaseCost, input.supplierId, input.reorderPoint, input.minimumOrderQuantity, input.packageEnabled ? 1 : 0, input.packageName, input.unitsPerPackage, input.packagePrice, input.packageNotes, input.reorderPackageCount)
  return getInventoryItem(id)!
}

export function deleteInventoryItem(id: string): void {
  const database = getSqlite()
  database.transaction(() => {
    const item = database.prepare('SELECT id FROM inventory_items WHERE id=? AND active=1').get(id)
    if (!item) throw new Error('منتج المخزون المطلوب غير موجود.')

    database.prepare('DELETE FROM purchase_requests WHERE inventory_item_id=?').run(id)
    const result = database.prepare(`UPDATE inventory_items
      SET active=0, catalog_service_id=NULL, supplier_id=NULL, updated_at=CURRENT_TIMESTAMP
      WHERE id=? AND active=1`).run(id)
    if (result.changes === 0) throw new Error('تعذر حذف منتج المخزون.')
  })()
}
