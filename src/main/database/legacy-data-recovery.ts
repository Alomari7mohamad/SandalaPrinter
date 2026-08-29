import Database from 'better-sqlite3'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const recoveryKey = 'migration.legacyInventoryRecoveryVersion'
const recoveryVersion = '1'

interface LegacySupplier {
  id: string
  name: string
  companyName: string
  whatsappPhone: string
  productTypes: string | null
}

interface LegacyInventoryItem {
  id: string
  quantity: number
  lowStockThreshold: number
  purchaseCost: number
  supplierId: string | null
  reorderPoint: number
  minimumOrderQuantity: number
  packageEnabled: number
  packageName: string | null
  unitsPerPackage: number | null
  packagePrice: number | null
  packageNotes: string | null
  reorderPackageCount: number | null
}

interface LegacyServiceSupplier { id: string; supplierId: string }

export function recoverLegacyInventoryData(database: Database.Database, legacyDatabasePath: string, currentDatabasePath: string): void {
  if (resolve(legacyDatabasePath) === resolve(currentDatabasePath) || !existsSync(legacyDatabasePath)) return
  if (database.prepare('SELECT value FROM app_settings WHERE key=?').pluck().get(recoveryKey) === recoveryVersion) return

  const legacy = new Database(legacyDatabasePath, { readonly: true })
  try {
    const requiredTables = legacy.prepare(`SELECT COUNT(*) FROM sqlite_master
      WHERE type='table' AND name IN ('suppliers','inventory_items','services')`).pluck().get()
    if (requiredTables !== 3) return

    const suppliers = legacy.prepare(`SELECT id, name, company_name companyName, whatsapp_phone whatsappPhone,
      product_types productTypes FROM suppliers WHERE active=1`).all() as LegacySupplier[]
    const inventory = legacy.prepare(`SELECT id, quantity, low_stock_threshold lowStockThreshold,
      purchase_cost purchaseCost, supplier_id supplierId, reorder_point reorderPoint,
      minimum_order_quantity minimumOrderQuantity, package_enabled packageEnabled,
      package_name packageName, units_per_package unitsPerPackage, package_price packagePrice,
      package_notes packageNotes, reorder_package_count reorderPackageCount
      FROM inventory_items WHERE active=1`).all() as LegacyInventoryItem[]
    const serviceSuppliers = legacy.prepare(`SELECT id, supplier_id supplierId FROM services
      WHERE active=1 AND supplier_id IS NOT NULL`).all() as LegacyServiceSupplier[]

    database.transaction(() => {
      const supplierIdMap = new Map<string, string>()
      const findSupplier = database.prepare(`SELECT id FROM suppliers
        WHERE company_name=? OR (name=? AND whatsapp_phone=?) ORDER BY active DESC LIMIT 1`)
      const insertSupplier = database.prepare(`INSERT OR IGNORE INTO suppliers
        (id, name, company_name, whatsapp_phone, product_types, active) VALUES (?, ?, ?, ?, ?, 1)`)
      const reactivateSupplier = database.prepare(`UPDATE suppliers SET active=1, updated_at=CURRENT_TIMESTAMP WHERE id=?`)

      for (const supplier of suppliers) {
        const existing = findSupplier.get(supplier.companyName, supplier.name, supplier.whatsappPhone) as { id: string } | undefined
        const targetId = existing?.id ?? supplier.id
        if (existing) reactivateSupplier.run(targetId)
        else insertSupplier.run(targetId, supplier.name, supplier.companyName, supplier.whatsappPhone, supplier.productTypes)
        supplierIdMap.set(supplier.id, targetId)
      }

      const itemExists = database.prepare('SELECT 1 FROM inventory_items WHERE id=? AND active=1')
      const restoreItem = database.prepare(`UPDATE inventory_items SET
        quantity=CASE WHEN quantity=0 AND ? > 0 THEN ? ELSE quantity END,
        low_stock_threshold=CASE WHEN low_stock_threshold=0 AND ? > 0 THEN ? ELSE low_stock_threshold END,
        purchase_cost=CASE WHEN purchase_cost=0 AND ? > 0 THEN ? ELSE purchase_cost END,
        supplier_id=COALESCE(supplier_id, ?),
        reorder_point=CASE WHEN reorder_point<=1 AND ? > 1 THEN ? ELSE reorder_point END,
        minimum_order_quantity=CASE WHEN minimum_order_quantity<=1 AND ? > 1 THEN ? ELSE minimum_order_quantity END,
        package_enabled=CASE WHEN package_enabled=0 AND ?=1 THEN 1 ELSE package_enabled END,
        package_name=CASE WHEN package_enabled=0 AND ?=1 THEN ? ELSE package_name END,
        units_per_package=CASE WHEN package_enabled=0 AND ?=1 THEN ? ELSE units_per_package END,
        package_price=CASE WHEN package_enabled=0 AND ?=1 THEN ? ELSE package_price END,
        package_notes=CASE WHEN package_enabled=0 AND ?=1 THEN ? ELSE package_notes END,
        reorder_package_count=CASE WHEN package_enabled=0 AND ?=1 THEN ? ELSE reorder_package_count END,
        updated_at=CURRENT_TIMESTAMP WHERE id=? AND active=1`)

      for (const item of inventory) {
        if (!itemExists.get(item.id)) continue
        const supplierId = item.supplierId ? supplierIdMap.get(item.supplierId) ?? null : null
        restoreItem.run(
          item.quantity, item.quantity, item.lowStockThreshold, item.lowStockThreshold,
          item.purchaseCost, item.purchaseCost, supplierId,
          item.reorderPoint, item.reorderPoint, item.minimumOrderQuantity, item.minimumOrderQuantity,
          item.packageEnabled, item.packageEnabled, item.packageName,
          item.packageEnabled, item.unitsPerPackage, item.packageEnabled, item.packagePrice,
          item.packageEnabled, item.packageNotes, item.packageEnabled, item.reorderPackageCount, item.id
        )
      }

      const restoreServiceSupplier = database.prepare(`UPDATE services SET supplier_id=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=? AND active=1 AND supplier_id IS NULL`)
      for (const service of serviceSuppliers) {
        const supplierId = supplierIdMap.get(service.supplierId)
        if (supplierId) restoreServiceSupplier.run(supplierId, service.id)
      }

      database.prepare(`INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP`).run(recoveryKey, recoveryVersion)
    })()
  } finally {
    legacy.close()
  }
}
