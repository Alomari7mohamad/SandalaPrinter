import type Database from 'better-sqlite3'

export const inventoryItems = [
  ['inv-paper-a4', 'PAPER_A4', 'ورق A4', 'ورقة', 0.075],
  ['inv-paper-a3', 'PAPER_A3', 'ورق A3', 'ورقة', 0.18],
  ['inv-bristol-a4', 'BRISTOL_A4', 'بروستول A4', 'ورقة', 0.18],
  ['inv-bristol-a3', 'BRISTOL_A3', 'بروستول A3', 'ورقة', 0.55],
  ['inv-chromo-a4', 'CHROMO_A4', 'خرومو A4', 'ورقة', 0.32],
  ['inv-chromo-a3', 'CHROMO_A3', 'خرومو A3', 'ورقة', 0.60],
  ['inv-cardboard', 'CARDBOARD', 'كرتون', 'قطعة', 0],
  ['inv-staples-small', 'STAPLES_SMALL', 'دبابيس صغيرة', 'علبة', 0],
  ['inv-staples-large', 'STAPLES_LARGE', 'دبابيس كبيرة', 'علبة', 0],
  ['inv-red-glue', 'RED_GLUE', 'دبق أحمر', 'عبوة', 0],
  ['inv-black-binders', 'BLACK_BINDERS', 'كلاسرات سوداء', 'قطعة', 0],
  ['inv-nylon-folders', 'NYLON_FOLDERS', 'دوسيات نايلون', 'قطعة', 0],
  ['inv-nylon-bags', 'NYLON_BAGS', 'أكياس نايلون', 'قطعة', 0],
  ['inv-binding-wires', 'BINDING_WIRES', 'أسلاك التجليد', 'قطعة', 0],
  ['inv-lamination-folders', 'LAMINATION_FOLDERS', 'دوسيات تغليف', 'قطعة', 0],
  ['inv-gelatin-paper', 'GELATIN_PAPER', 'ورق جيلاتين', 'ورقة', 0],
  ['inv-frames-a3', 'FRAMES_A3', 'براويز A3', 'قطعة', 0],
  ['inv-frames-a4', 'FRAMES_A4', 'براويز A4', 'قطعة', 0]
] as const

export function seedInventoryItems(database: Database.Database): void {
  const insert = database.prepare(`INSERT OR IGNORE INTO inventory_items (id, sku, name, unit, quantity, low_stock_threshold, purchase_cost, active) VALUES (?, ?, ?, ?, 0, 0, ?, 1)`)
  const updateKnownCost = database.prepare(`UPDATE inventory_items SET purchase_cost = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND purchase_cost = 0`)
  const costVersion = database.prepare("SELECT value FROM app_settings WHERE key = 'seed.inventoryCostsVersion'").pluck().get()
  const saveCostVersion = database.prepare(`INSERT INTO app_settings (key, value, updated_at) VALUES ('seed.inventoryCostsVersion', '1', CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = '1', updated_at = CURRENT_TIMESTAMP`)
  database.transaction(() => {
    for (const [id, sku, name, unit, purchaseCost] of inventoryItems) insert.run(id, sku, name, unit, purchaseCost)
    if (costVersion !== '1') {
      for (const [id, , , , purchaseCost] of inventoryItems) {
        if (purchaseCost > 0) updateKnownCost.run(purchaseCost, id)
      }
      saveCostVersion.run()
    }
    const links = [
      ['inv-black-binders', 'product-black-binder'], ['inv-nylon-folders', 'product-nylon-folder'],
      ['inv-nylon-bags', 'product-nylon-bag'], ['inv-staples-large', 'product-large-staples'],
      ['inv-staples-small', 'product-small-staples'], ['inv-red-glue', 'product-red-glue']
    ] as const
    const link = database.prepare('UPDATE inventory_items SET catalog_service_id=? WHERE id=? AND catalog_service_id IS NULL AND EXISTS (SELECT 1 FROM services WHERE id=?)')
    for (const [inventoryId, serviceId] of links) link.run(serviceId, inventoryId, serviceId)
    database.prepare(`INSERT OR IGNORE INTO inventory_items (id, sku, name, unit, quantity, low_stock_threshold, purchase_cost, reorder_point, minimum_order_quantity, catalog_service_id, active)
      SELECT 'inv-catalog-product-bag-folder', code, name_ar, unit, 0, 1, COALESCE(unit_cost, 0), 1, 1, id, 1 FROM services WHERE id='product-bag-folder'`).run()
  })()
}
