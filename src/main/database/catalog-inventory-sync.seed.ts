import type Database from 'better-sqlite3'

const seedKey = 'seed.catalogInventorySyncVersion'
const seedVersion = '1'

interface StandaloneInventoryItem {
  id: string
  name: string
  sku: string | null
  unit: string
  purchaseCost: number
  supplierId: string | null
  reorderPoint: number
  minimumOrderQuantity: number
  categoryId: string
}

export function seedCatalogInventorySync(database: Database.Database): void {
  if (database.prepare('SELECT value FROM app_settings WHERE key=?').pluck().get(seedKey) === seedVersion) return

  database.transaction(() => {
    const items = database.prepare(`SELECT i.id, i.name, i.sku, i.unit, i.purchase_cost purchaseCost,
      i.supplier_id supplierId, i.reorder_point reorderPoint, i.minimum_order_quantity minimumOrderQuantity,
      i.category_id categoryId FROM inventory_items i
      JOIN service_categories c ON c.id=i.category_id AND c.active=1
      WHERE i.active=1 AND i.catalog_service_id IS NULL`).all() as StandaloneInventoryItem[]
    const codeExists = database.prepare('SELECT 1 FROM services WHERE code=?')
    const insertService = database.prepare(`INSERT INTO services (id, category_id, code, name_ar, name_he,
      material_type, size, color_mode, coverage, unit, item_type, supplier_id, reorder_point,
      minimum_order_quantity, cost_type, unit_cost, cost_batch_size, cost_calculation,
      sale_calculation, active, notes) VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, ?, 'PRODUCT', ?, ?, ?,
      'PER_UNIT', ?, NULL, 'COST_STRATEGY', 'PRICING_RULE', 1, ?)`)
    const linkInventory = database.prepare(`UPDATE inventory_items SET catalog_service_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)

    for (const item of items) {
      const serviceId = `inventory-catalog-${item.id}`
      const preferredCode = item.sku?.trim() || `STOCK_${item.id.replace(/-/g, '').slice(0, 16).toUpperCase()}`
      const code = codeExists.get(preferredCode) ? `STOCK_${item.id.replace(/-/g, '').slice(0, 16).toUpperCase()}` : preferredCode
      insertService.run(serviceId, item.categoryId, code, item.name, item.unit, item.supplierId,
        item.reorderPoint, item.minimumOrderQuantity, item.purchaseCost,
        'منتج موحّد مع المخزون؛ يظهر تحت التصنيف نفسه في جميع صفحات التطبيق.')
      linkInventory.run(serviceId, item.id)
    }

    database.prepare(`UPDATE inventory_items SET category_id=(SELECT category_id FROM services WHERE id=catalog_service_id),
      updated_at=CURRENT_TIMESTAMP WHERE active=1 AND catalog_service_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM services WHERE id=catalog_service_id AND active=1)
      AND category_id IS NOT (SELECT category_id FROM services WHERE id=catalog_service_id)`).run()

    database.prepare(`INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP`).run(seedKey, seedVersion)
  })()
}
