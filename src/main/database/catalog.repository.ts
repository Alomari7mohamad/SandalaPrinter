import { randomUUID } from 'node:crypto'
import type { PriceRule } from '../../shared/pricing/pricing-types'
import type { PricingRuleInput, ServiceCategoryDto, ServiceDto, ServiceInput } from '../../shared/contracts'
import { getSqlite } from './client'

interface CategoryRow { id: string; code: string; nameAr: string; active: number; sortOrder: number }
interface ServiceRow extends Omit<ServiceDto, 'active'> { active: number }
interface RuleRow extends Omit<PriceRule, 'active'> { active: number }

export function listCategories(): ServiceCategoryDto[] {
  const rows = getSqlite().prepare(`SELECT id, code, name_ar nameAr, active, sort_order sortOrder FROM service_categories WHERE active = 1 ORDER BY sort_order, name_ar`).all() as CategoryRow[]
  return rows.map((row) => ({ ...row, active: Boolean(row.active) }))
}

export function saveCategory(nameAr: string): ServiceCategoryDto {
  const database = getSqlite()
  const duplicate = database.prepare('SELECT id FROM service_categories WHERE lower(name_ar) = lower(?)').get(nameAr)
  if (duplicate) throw new Error('يوجد تصنيف بهذا الاسم بالفعل.')
  const id = randomUUID()
  const code = `CUSTOM_${id.replace(/-/g, '').slice(0, 12).toUpperCase()}`
  const sortOrder = Number(database.prepare('SELECT COALESCE(MAX(sort_order), 0) + 10 FROM service_categories').pluck().get())
  database.prepare('INSERT INTO service_categories (id, name_ar, code, active, sort_order) VALUES (?, ?, ?, 1, ?)').run(id, nameAr, code, sortOrder)
  return { id, nameAr, code, active: true, sortOrder }
}

export function listServices(): ServiceDto[] {
  const rows = getSqlite().prepare(`
    SELECT s.id, s.code, s.name_ar nameAr, s.name_he nameHe, s.category_id categoryId, COALESCE(c.name_ar, 'بدون تصنيف') categoryName,
      s.material_type paperType, s.size, s.color_mode colorMode, s.coverage, s.unit,
      s.item_type itemType, s.supplier_id supplierId, sup.company_name supplierName,
      s.reorder_point reorderPoint, s.minimum_order_quantity minimumOrderQuantity, s.cost_type costType,
      s.unit_cost unitCost, s.cost_batch_size costBatchSize, s.active, s.notes,
      COUNT(pr.id) pricingRulesCount, s.created_at createdAt, s.updated_at updatedAt
    FROM services s LEFT JOIN service_categories c ON c.id = s.category_id
    LEFT JOIN suppliers sup ON sup.id = s.supplier_id
    LEFT JOIN pricing_rules pr ON pr.service_id = s.id
    GROUP BY s.id ORDER BY c.sort_order, s.name_ar
  `).all() as ServiceRow[]
  return rows.map((row) => ({ ...row, active: Boolean(row.active) }))
}

export function getService(id: string): ServiceDto | undefined {
  return listServices().find((service) => service.id === id)
}

export function saveService(input: ServiceInput): ServiceDto {
  const database = getSqlite()
  const id = input.id ?? randomUUID()
  database.transaction(() => {
    if (input.id) {
      database.prepare(`UPDATE services SET code=?, name_ar=?, name_he=?, category_id=?, material_type=?, size=?, color_mode=?, coverage=?, unit=?, item_type=?, supplier_id=?, reorder_point=?, minimum_order_quantity=?, cost_type=?, unit_cost=?, cost_batch_size=?, active=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
        .run(input.code, input.nameAr, input.nameHe, input.categoryId, input.paperType, input.size, input.colorMode, input.coverage, input.unit, input.itemType, input.supplierId, input.reorderPoint, input.minimumOrderQuantity, input.costType, input.unitCost, input.costBatchSize, input.active ? 1 : 0, input.notes, id)
    } else {
      database.prepare(`INSERT INTO services (id, code, name_ar, name_he, category_id, material_type, size, color_mode, coverage, unit, item_type, supplier_id, reorder_point, minimum_order_quantity, cost_type, unit_cost, cost_batch_size, cost_calculation, sale_calculation, active, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COST_STRATEGY', 'PRICING_RULE', ?, ?)`)
        .run(id, input.code, input.nameAr, input.nameHe, input.categoryId, input.paperType, input.size, input.colorMode, input.coverage, input.unit, input.itemType, input.supplierId, input.reorderPoint, input.minimumOrderQuantity, input.costType, input.unitCost, input.costBatchSize, input.active ? 1 : 0, input.notes)
    }

    const linked = database.prepare('SELECT id FROM inventory_items WHERE catalog_service_id = ?').get(id) as { id: string } | undefined
    if (input.itemType === 'PRODUCT') {
      if (linked) {
        database.prepare(`UPDATE inventory_items SET name=?, sku=?, unit=?, purchase_cost=?, supplier_id=?, reorder_point=?, minimum_order_quantity=?, active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
          .run(input.nameAr, input.code, input.unit, input.unitCost ?? 0, input.supplierId, input.reorderPoint, input.minimumOrderQuantity, input.active ? 1 : 0, linked.id)
      } else {
        database.prepare(`INSERT INTO inventory_items (id, name, sku, unit, quantity, low_stock_threshold, purchase_cost, supplier_id, reorder_point, minimum_order_quantity, catalog_service_id, active)
          VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`)
          .run(randomUUID(), input.nameAr, input.code, input.unit, input.reorderPoint, input.unitCost ?? 0, input.supplierId, input.reorderPoint, input.minimumOrderQuantity, id, input.active ? 1 : 0)
      }
    } else if (linked) {
      database.prepare("DELETE FROM purchase_requests WHERE inventory_item_id = ?").run(linked.id)
      database.prepare('UPDATE inventory_items SET active=0, catalog_service_id=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(linked.id)
    }
  })()
  const saved = getService(id)
  if (!saved) throw new Error('تعذر حفظ الخدمة.')
  return saved
}

export function setServiceActive(id: string, active: boolean): void {
  const result = getSqlite().prepare('UPDATE services SET active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(active ? 1 : 0, id)
  if (result.changes === 0) throw new Error('الخدمة المطلوبة غير موجودة.')
}

export function deleteService(id: string): void {
  const database = getSqlite()
  database.transaction(() => {
    const linkedInventory = database.prepare('SELECT id FROM inventory_items WHERE catalog_service_id=?').get(id) as { id: string } | undefined
    if (linkedInventory) {
      database.prepare('DELETE FROM purchase_requests WHERE inventory_item_id=?').run(linkedInventory.id)
      database.prepare('UPDATE inventory_items SET active=0, catalog_service_id=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(linkedInventory.id)
    }
    database.prepare('UPDATE order_items SET service_id = NULL WHERE service_id = ?').run(id)
    database.prepare('DELETE FROM pricing_rules WHERE service_id = ?').run(id)
    const result = database.prepare('DELETE FROM services WHERE id = ?').run(id)
    if (result.changes === 0) throw new Error('الخدمة المطلوبة غير موجودة.')
  })()
}

export function listPricingRules(serviceId: string): PriceRule[] {
  const rows = getSqlite().prepare(`SELECT id, service_id serviceId, type ruleType, exact_quantity exactQuantity, min_quantity minQuantity, max_quantity maxQuantity, sale_price fixedPrice, sale_unit_price unitPrice, priority, active FROM pricing_rules WHERE service_id=? ORDER BY priority DESC, COALESCE(exact_quantity, min_quantity, 0)`).all(serviceId) as RuleRow[]
  return rows.map((row) => ({ ...row, active: Boolean(row.active) }))
}

export function getPricingRule(id: string): PriceRule | undefined {
  const row = getSqlite().prepare(`SELECT id, service_id serviceId, type ruleType, exact_quantity exactQuantity, min_quantity minQuantity, max_quantity maxQuantity, sale_price fixedPrice, sale_unit_price unitPrice, priority, active FROM pricing_rules WHERE id=?`).get(id) as RuleRow | undefined
  return row ? { ...row, active: Boolean(row.active) } : undefined
}

export function savePricingRule(input: PricingRuleInput): PriceRule {
  const database = getSqlite()
  const id = input.id ?? randomUUID()
  database.transaction(() => {
    if (input.id) {
      database.prepare(`UPDATE pricing_rules SET service_id=?, type=?, exact_quantity=?, min_quantity=?, max_quantity=?, sale_price=?, sale_unit_price=?, priority=?, active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
        .run(input.serviceId, input.ruleType, input.exactQuantity, input.minQuantity, input.maxQuantity, input.fixedPrice, input.unitPrice, input.priority, input.active ? 1 : 0, id)
    } else {
      database.prepare(`INSERT INTO pricing_rules (id, service_id, type, exact_quantity, min_quantity, max_quantity, sale_price, sale_unit_price, priority, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, input.serviceId, input.ruleType, input.exactQuantity, input.minQuantity, input.maxQuantity, input.fixedPrice, input.unitPrice, input.priority, input.active ? 1 : 0)
    }
  })()
  const saved = getPricingRule(id)
  if (!saved) throw new Error('تعذر حفظ قاعدة السعر.')
  return saved
}

export function setPricingRuleActive(id: string, active: boolean): void {
  const result = getSqlite().prepare('UPDATE pricing_rules SET active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(active ? 1 : 0, id)
  if (result.changes === 0) throw new Error('قاعدة السعر المطلوبة غير موجودة.')
}

export function deletePricingRule(id: string): void {
  const result = getSqlite().prepare('DELETE FROM pricing_rules WHERE id=?').run(id)
  if (result.changes === 0) throw new Error('قاعدة السعر المطلوبة غير موجودة.')
}
