import type Database from 'better-sqlite3'
import { ghassanCategories, ghassanProducts, type GhassanCategoryKey } from './ghassan-products.data'

const seedVersionKey = 'seed.ghassanProductsVersion'
const seedVersion = '2'
const legacyCategoryNames = ['منتجات سبليميشن']

function archiveCategory(database: Database.Database, categoryId: string, categoryName: string): void {
  const services = database.prepare('SELECT id FROM services WHERE category_id=?').all(categoryId) as { id: string }[]
  for (const service of services) {
    database.prepare('UPDATE pricing_rules SET active=0, updated_at=CURRENT_TIMESTAMP WHERE service_id=?').run(service.id)
    database.prepare(`UPDATE inventory_items SET active=0, sku='ARCHIVED-' || id,
      updated_at=CURRENT_TIMESTAMP WHERE catalog_service_id=?`).run(service.id)
    database.prepare(`UPDATE services SET active=0, code='ARCHIVED-' || id,
      updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(service.id)
  }
  database.prepare(`UPDATE service_categories SET active=0,
    name_ar=?, code='ARCHIVED-GHASSAN-' || id, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(`${categoryName} (قديم - مؤرشف)`, categoryId)
}

export function seedGhassanProducts(database: Database.Database): void {
  const currentVersion = database.prepare('SELECT value FROM app_settings WHERE key=?').pluck().get(seedVersionKey)
  if (currentVersion === seedVersion) return

  database.transaction(() => {
    const existingSupplier = database.prepare(`SELECT id FROM suppliers
      WHERE name='غسان' OR company_name='غسان 2000'
      ORDER BY CASE WHEN company_name='غسان 2000' THEN 0 ELSE 1 END LIMIT 1`).get() as { id: string } | undefined
    const supplierId = existingSupplier?.id ?? 'supplier-ghassan-2000'
    if (existingSupplier) {
      database.prepare(`UPDATE suppliers SET name='غسان', company_name='غسان 2000',
        product_types='أكواب وعبوات، حقائب ومقالم، دفاتر، هدايا وديكور، براويز سبليميشن، ميداليات، أعلام وأوشحة، دروع، شهادات، براويز', active=1, updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(supplierId)
    } else {
      database.prepare(`INSERT INTO suppliers (id, name, company_name, whatsapp_phone, product_types, active)
        VALUES (?, 'غسان', 'غسان 2000', '', 'أكواب وعبوات، حقائب ومقالم، دفاتر، هدايا وديكور، براويز سبليميشن، ميداليات، أعلام وأوشحة، دروع، شهادات، براويز', 1)`).run(supplierId)
    }

    for (const legacyName of legacyCategoryNames) {
      const legacyCategories = database.prepare('SELECT id FROM service_categories WHERE name_ar=? AND active=1').all(legacyName) as { id: string }[]
      for (const legacyCategory of legacyCategories) archiveCategory(database, legacyCategory.id, legacyName)
    }

    for (const category of ghassanCategories) {
      const oldCategories = database.prepare('SELECT id FROM service_categories WHERE name_ar=? AND active=1').all(category.name) as { id: string }[]
      for (const oldCategory of oldCategories) {
        if (oldCategory.id !== category.id) archiveCategory(database, oldCategory.id, category.name)
      }
    }

    for (const category of ghassanCategories) {
      database.prepare(`INSERT INTO service_categories (id, code, name_ar, active, sort_order)
        VALUES (?, ?, ?, 1, ?)
        ON CONFLICT(id) DO UPDATE SET code=excluded.code, name_ar=excluded.name_ar,
          active=1, sort_order=excluded.sort_order, updated_at=CURRENT_TIMESTAMP`)
        .run(category.id, category.code, category.name, category.sortOrder)
    }

    const categoryByKey = Object.fromEntries(ghassanCategories.map((category) => [category.key, category.id])) as Record<GhassanCategoryKey, string>
    ghassanProducts.forEach((product, index) => {
      const [categoryKey, name, productNumber, size, unitCost, supplierQuantity, listedTotal, extraNotes] = product
      const suffix = String(index + 1).padStart(3, '0')
      const serviceId = `ghassan-product-${suffix}`
      const inventoryId = `inv-ghassan-product-${suffix}`
      const catalogCode = `GH2000-${productNumber}`
      const notes = [
        `رقم المنتج لدى غسان: ${productNumber}.`,
        `كمية المورد: ${supplierQuantity}.`,
        `الإجمالي المذكور في الملف: ${listedTotal} ₪.`,
        extraNotes
      ].filter(Boolean).join(' ')

      database.prepare(`INSERT INTO services (id, category_id, code, name_ar, name_he, material_type, size,
        color_mode, coverage, unit, item_type, supplier_id, reorder_point, minimum_order_quantity,
        cost_type, unit_cost, cost_batch_size, cost_calculation, sale_calculation, active, notes)
        VALUES (?, ?, ?, ?, NULL, NULL, ?, NULL, NULL, 'قطعة', 'PRODUCT', ?, 1, ?,
        'PER_UNIT', ?, NULL, 'COST_STRATEGY', 'PRICING_RULE', 1, ?)
        ON CONFLICT(id) DO UPDATE SET category_id=excluded.category_id, code=excluded.code,
          name_ar=excluded.name_ar, size=excluded.size, unit=excluded.unit,
          item_type=excluded.item_type, supplier_id=excluded.supplier_id,
          active=1, notes=excluded.notes, updated_at=CURRENT_TIMESTAMP`)
        .run(serviceId, categoryByKey[categoryKey], catalogCode, name, size, supplierId, supplierQuantity, unitCost, notes)

      database.prepare(`INSERT INTO pricing_rules (id, service_id, type, min_quantity, max_quantity,
        exact_quantity, sale_price, sale_unit_price, priority, active)
        VALUES (?, ?, 'UNIT_PRICE', 1, NULL, NULL, NULL, ?, 10, 1)
        ON CONFLICT(id) DO UPDATE SET active=1, updated_at=CURRENT_TIMESTAMP`)
        .run(`ghassan-price-${suffix}`, serviceId, unitCost)

      database.prepare(`INSERT INTO inventory_items (id, name, sku, unit, quantity, low_stock_threshold,
        purchase_cost, supplier_id, reorder_point, minimum_order_quantity, catalog_service_id, active)
        VALUES (?, ?, ?, 'قطعة', 0, 1, ?, ?, 1, ?, ?, 1)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name, sku=excluded.sku,
          unit=excluded.unit, supplier_id=excluded.supplier_id,
          catalog_service_id=excluded.catalog_service_id, active=1,
          updated_at=CURRENT_TIMESTAMP`)
        .run(inventoryId, name, catalogCode, unitCost, supplierId, supplierQuantity, serviceId)
    })

    database.prepare(`INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP`).run(seedVersionKey, seedVersion)
  })()
}
