import type Database from 'better-sqlite3'

export interface PrintingInventoryDefinition {
  id: string
  name: string
  sku: string
  unitsPerPackage: number | null
  packagePrice: number | null
}

export const printingInventoryDefinitions: PrintingInventoryDefinition[] = [
  { id: 'inv-paper-a4', name: 'ورق A4', sku: 'PAPER_A4', unitsPerPackage: 500, packagePrice: 12 },
  { id: 'inv-paper-a3', name: 'ورق A3', sku: 'PAPER_A3', unitsPerPackage: 500, packagePrice: 30 },
  { id: 'inv-bristol-a4', name: 'بروستول A4 عادي', sku: 'BRISTOL_A4', unitsPerPackage: 70, packagePrice: 60 },
  { id: 'inv-bristol-a3', name: 'بروستول A3 عادي', sku: 'BRISTOL_A3', unitsPerPackage: 70, packagePrice: 120 },
  { id: 'inv-bristol-color-a4', name: 'بروستول طباعة ملون A4', sku: 'BRISTOL_COLOR_A4', unitsPerPackage: 1000, packagePrice: 70 },
  { id: 'inv-bristol-color-a3', name: 'بروستول طباعة ملون A3', sku: 'BRISTOL_COLOR_A3', unitsPerPackage: 1000, packagePrice: 140 },
  { id: 'inv-chromo-a3', name: 'ورق خرومو عادي 250 غرام A3', sku: 'CHROMO_A3', unitsPerPackage: 1000, packagePrice: 350 },
  { id: 'inv-chromo-normal-135-a3', name: 'ورق خرومو عادي 135 غرام A3', sku: 'CHROMO_NORMAL_135_A3', unitsPerPackage: 1000, packagePrice: 180 },
  { id: 'inv-chromo-glossy-250-a3', name: 'ورق خرومو لامع 250 غرام A3', sku: 'CHROMO_GLOSSY_250_A3', unitsPerPackage: 1000, packagePrice: 350 },
  { id: 'inv-chromo-glossy-135-a3', name: 'ورق خرومو لامع 135 غرام A3', sku: 'CHROMO_GLOSSY_135_A3', unitsPerPackage: 1000, packagePrice: 180 },
  { id: 'inv-sticker-white-a3', name: 'ورق ملصقات أبيض A3', sku: 'STICKER_WHITE_A3', unitsPerPackage: 200, packagePrice: 700 },
  { id: 'inv-sticker-transparent-a3', name: 'ورق ملصقات شفاف A3', sku: 'STICKER_TRANSPARENT_A3', unitsPerPackage: 200, packagePrice: 700 },
  { id: 'inv-duplex-cardboard-400', name: 'ورق كرتون دوبليكس 400 غرام', sku: 'DUPLEX_CARDBOARD_400', unitsPerPackage: null, packagePrice: null },
  { id: 'inv-ncr-invoice-a4', name: 'ورق NCR للفواتير A4', sku: 'NCR_INVOICE_A4', unitsPerPackage: null, packagePrice: null },
  { id: 'inv-sublimation-german', name: 'ورق سبليميشن ألماني', sku: 'SUBLIMATION_GERMAN', unitsPerPackage: 200, packagePrice: 140 },
  { id: 'inv-sublimation-chinese', name: 'ورق سبليميشن صيني', sku: 'SUBLIMATION_CHINESE', unitsPerPackage: 100, packagePrice: 50 }
]

const seedVersionKey = 'seed.printingInventoryVersion'
const seedVersion = '2'

export function seedPrintingInventory(database: Database.Database): void {
  const currentVersion = database.prepare('SELECT value FROM app_settings WHERE key=?').pluck().get(seedVersionKey)
  if (currentVersion === seedVersion) return

  database.transaction(() => {
    const existingCategory = database.prepare(`SELECT id FROM service_categories
      WHERE name_ar='طباعة' AND active=1 ORDER BY sort_order, created_at LIMIT 1`).get() as { id: string } | undefined
    const categoryId = existingCategory?.id ?? 'cat-inventory-printing'
    if (!existingCategory) {
      database.prepare(`INSERT INTO service_categories (id, code, name_ar, active, sort_order)
        VALUES (?, 'INVENTORY_PRINTING', 'طباعة', 1, 90)`).run(categoryId)
    }

    database.prepare(`UPDATE inventory_items SET category_id=?, updated_at=CURRENT_TIMESTAMP
      WHERE active=1 AND category_id IS NULL
        AND (catalog_service_id IS NULL OR (SELECT category_id FROM services WHERE id=catalog_service_id) IS NULL)`).run(categoryId)

    for (const definition of printingInventoryDefinitions) {
      const existing = database.prepare('SELECT id FROM inventory_items WHERE id=?').get(definition.id)
      const packageEnabled = definition.unitsPerPackage !== null && definition.packagePrice !== null
      const threshold = packageEnabled ? definition.unitsPerPackage! - 1 : 0
      const packageNotes = packageEnabled
        ? 'الشراء والطلب في النواقص بالرزمة، والاستهلاك في طلبات الطباعة بالورقة.'
        : 'لم يحدد بعد عدد الأوراق في الرزمة أو سعرها.'

      if (existing) {
        database.prepare(`UPDATE inventory_items SET name=?, sku=?, unit='ورقة', category_id=?,
          low_stock_threshold=?, reorder_point=?, minimum_order_quantity=1,
          package_enabled=?, package_name=?, units_per_package=?, package_price=?, package_notes=?,
          reorder_package_count=?, active=1, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
          .run(definition.name, definition.sku, categoryId, threshold, threshold, packageEnabled ? 1 : 0,
            packageEnabled ? 'رزمة' : null, definition.unitsPerPackage, definition.packagePrice, packageNotes,
            packageEnabled ? 1 : null, definition.id)
      } else {
        const unitPurchaseCost = packageEnabled ? definition.packagePrice! / definition.unitsPerPackage! : 0
        database.prepare(`INSERT INTO inventory_items (id, name, sku, unit, quantity, low_stock_threshold,
          purchase_cost, reorder_point, minimum_order_quantity, category_id, package_enabled, package_name,
          units_per_package, package_price, package_notes, reorder_package_count, active)
          VALUES (?, ?, ?, 'ورقة', 0, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, 1)`)
          .run(definition.id, definition.name, definition.sku, threshold, unitPurchaseCost, threshold,
            categoryId, packageEnabled ? 1 : 0, packageEnabled ? 'رزمة' : null,
            definition.unitsPerPackage, definition.packagePrice, packageNotes, packageEnabled ? 1 : null)
      }
    }

    database.prepare(`INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP`).run(seedVersionKey, seedVersion)
  })()
}
