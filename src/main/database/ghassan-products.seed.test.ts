import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { ghassanCategories, ghassanProducts } from './ghassan-products.data'
import { seedGhassanProducts } from './ghassan-products.seed'
import { seedInventoryItems } from './inventory.seed'
import { seedPrintingInventory } from './printing-inventory.seed'
import initialMigration from './migrations/0000_initial.sql?raw'
import phaseTwoMigration from './migrations/0001_phase2_cost_strategy.sql?raw'
import sandalaBrandMigration from './migrations/0002_sandala_brand.sql?raw'
import orderDeliveryDetailsMigration from './migrations/0003_order_delivery_details.sql?raw'
import orderPaidAtMigration from './migrations/0004_order_paid_at.sql?raw'
import orderBusinessLogoMigration from './migrations/0005_order_business_logo.sql?raw'
import bilingualServiceNamesMigration from './migrations/0006_bilingual_service_names.sql?raw'
import unitCostOnlyMigration from './migrations/0007_unit_cost_only.sql?raw'
import suppliersShortagesMigration from './migrations/0008_suppliers_shortages.sql?raw'
import catalogInventoryProductsMigration from './migrations/0009_catalog_inventory_products.sql?raw'
import inventoryPackagesMigration from './migrations/0010_inventory_packages.sql?raw'
import inventoryCategoriesMigration from './migrations/0011_inventory_categories.sql?raw'

function createDatabase(): Database.Database {
  const database = new Database(':memory:')
  database.pragma('foreign_keys=ON')
  for (const migration of [initialMigration, phaseTwoMigration, sandalaBrandMigration, orderDeliveryDetailsMigration,
    orderPaidAtMigration, orderBusinessLogoMigration, bilingualServiceNamesMigration, unitCostOnlyMigration,
    suppliersShortagesMigration, catalogInventoryProductsMigration, inventoryPackagesMigration, inventoryCategoriesMigration]) database.exec(migration)
  return database
}

describe('منتجات غسان 2000', () => {
  it('توزع جميع المنتجات المستخرجة على تصنيفاتها التفصيلية', () => {
    expect(ghassanCategories.map((category) => category.name)).toEqual([
      'أكواب وعبوات سبليميشن', 'حقائب ومقالم سبليميشن', 'دفاتر سبليميشن',
      'مستلزمات مكتبية سبليميشن', 'هدايا وديكور سبليميشن', 'براويز سبليميشن',
      'ميداليات سبليميشن', 'أعلام وأوشحة', 'دروع', 'شهادات', 'براويز'
    ])
    expect(ghassanProducts).toHaveLength(83)
    expect(ghassanProducts.filter(([category]) => category === 'SUBLIMATION_DRINKWARE')).toHaveLength(16)
    expect(ghassanProducts.filter(([category]) => category === 'SUBLIMATION_BAGS')).toHaveLength(5)
    expect(ghassanProducts.filter(([category]) => category === 'SUBLIMATION_NOTEBOOKS')).toHaveLength(3)
    expect(ghassanProducts.filter(([category]) => category === 'SUBLIMATION_DESK')).toHaveLength(4)
    expect(ghassanProducts.filter(([category]) => category === 'SUBLIMATION_GIFTS')).toHaveLength(4)
    expect(ghassanProducts.filter(([category]) => category === 'SUBLIMATION_FRAMES')).toHaveLength(12)
    expect(ghassanProducts.filter(([category]) => category === 'SUBLIMATION_KEYCHAINS')).toHaveLength(4)
    expect(ghassanProducts.filter(([category]) => category === 'SUBLIMATION_FLAGS')).toHaveLength(4)
    expect(ghassanProducts.filter(([category]) => category === 'AWARDS')).toHaveLength(10)
    expect(ghassanProducts.filter(([category]) => category === 'CERTIFICATES')).toHaveLength(4)
    expect(ghassanProducts.filter(([category]) => category === 'FRAMES')).toHaveLength(17)
  })

  it('يحفظ رقمًا فريدًا وتكلفة وكمية مورد صالحة لكل منتج', () => {
    const productNumbers = ghassanProducts.map(([, , productNumber]) => productNumber)
    expect(new Set(productNumbers).size).toBe(productNumbers.length)
    expect(ghassanProducts.every(([, , , , unitCost]) => unitCost > 0)).toBe(true)
    expect(ghassanProducts.every(([, , , , , supplierQuantity]) => supplierQuantity > 0)).toBe(true)
  })

  it('يؤرشف التصنيف القديم ويحافظ على سجلاته ثم يضيف الكتالوج الجديد كاملًا', () => {
    const database = createDatabase()
    database.prepare(`INSERT INTO service_categories (id, code, name_ar) VALUES ('old-frames', 'OLD_FRAMES', 'براويز')`).run()
    database.prepare(`INSERT INTO services (id, category_id, code, name_ar, unit) VALUES ('old-frame', 'old-frames', 'OLD-FRAME', 'برواز قديم', 'قطعة')`).run()
    database.prepare(`INSERT INTO inventory_items (id, name, sku, unit, quantity, catalog_service_id) VALUES ('old-frame-stock', 'برواز قديم', 'OLD-FRAME', 'قطعة', 7, 'old-frame')`).run()

    seedGhassanProducts(database)

    expect(database.prepare(`SELECT active FROM service_categories WHERE id='old-frames'`).pluck().get()).toBe(0)
    expect(database.prepare(`SELECT active FROM services WHERE id='old-frame'`).pluck().get()).toBe(0)
    expect(database.prepare(`SELECT quantity FROM inventory_items WHERE id='old-frame-stock'`).pluck().get()).toBe(7)
    expect(database.prepare(`SELECT COUNT(*) FROM services WHERE active=1 AND supplier_id='supplier-ghassan-2000'`).pluck().get()).toBe(83)
    expect(database.prepare(`SELECT COUNT(*) FROM pricing_rules WHERE active=1 AND service_id LIKE 'ghassan-product-%'`).pluck().get()).toBe(83)
    expect(database.prepare(`SELECT COUNT(*) FROM inventory_items WHERE active=1 AND catalog_service_id LIKE 'ghassan-product-%'`).pluck().get()).toBe(83)
    expect(database.prepare(`SELECT company_name FROM suppliers WHERE id='supplier-ghassan-2000'`).pluck().get()).toBe('غسان 2000')

    seedGhassanProducts(database)
    expect(database.prepare(`SELECT COUNT(*) FROM services WHERE active=1 AND supplier_id='supplier-ghassan-2000'`).pluck().get()).toBe(83)
    database.close()
  })

  it('ينقل منتجات الإصدار السابق إلى التصنيفات الجديدة دون تغيير المخزون أو الأسعار المعدلة', () => {
    const database = createDatabase()
    seedGhassanProducts(database)
    database.prepare(`INSERT INTO service_categories (id, code, name_ar)
      VALUES ('cat-ghassan-sublimation', 'GHASSAN_SUBLIMATION', 'منتجات سبليميشن')`).run()
    database.prepare(`UPDATE services SET category_id='cat-ghassan-sublimation'
      WHERE id='ghassan-product-001'`).run()
    database.prepare(`UPDATE inventory_items SET quantity=17, purchase_cost=99
      WHERE id='inv-ghassan-product-001'`).run()
    database.prepare(`UPDATE pricing_rules SET sale_unit_price=88
      WHERE id='ghassan-price-001'`).run()
    database.prepare(`UPDATE app_settings SET value='1' WHERE key='seed.ghassanProductsVersion'`).run()

    seedGhassanProducts(database)

    expect(database.prepare(`SELECT active FROM service_categories
      WHERE id='cat-ghassan-sublimation'`).pluck().get()).toBe(0)
    expect(database.prepare(`SELECT c.name_ar FROM services s JOIN service_categories c ON c.id=s.category_id
      WHERE s.id='ghassan-product-001'`).pluck().get()).toBe('أكواب وعبوات سبليميشن')
    expect(database.prepare(`SELECT quantity FROM inventory_items
      WHERE id='inv-ghassan-product-001'`).pluck().get()).toBe(17)
    expect(database.prepare(`SELECT purchase_cost FROM inventory_items
      WHERE id='inv-ghassan-product-001'`).pluck().get()).toBe(99)
    expect(database.prepare(`SELECT sale_unit_price FROM pricing_rules
      WHERE id='ghassan-price-001'`).pluck().get()).toBe(88)
    database.close()
  })

  it('يصنف مواد الطباعة ويضبط الرزم مع الحفاظ على الرصيد الحالي بالورقة', () => {
    const database = createDatabase()
    seedInventoryItems(database)
    database.prepare(`UPDATE inventory_items SET quantity=460 WHERE id='inv-paper-a4'`).run()
    database.prepare(`INSERT INTO inventory_items (id, name, sku, unit, quantity) VALUES ('uncategorized-item', 'مادة قديمة', 'OLD_ITEM', 'قطعة', 3)`).run()

    seedPrintingInventory(database)

    const paper = database.prepare(`SELECT quantity, units_per_package unitsPerPackage,
      package_price packagePrice, reorder_point reorderPoint, minimum_order_quantity minimumOrderQuantity
      FROM inventory_items WHERE id='inv-paper-a4'`).get() as Record<string, number>
    expect(paper).toMatchObject({ quantity: 460, unitsPerPackage: 500, packagePrice: 12, reorderPoint: 499, minimumOrderQuantity: 1 })
    expect(database.prepare(`SELECT name_ar FROM service_categories WHERE id=(SELECT category_id FROM inventory_items WHERE id='uncategorized-item')`).pluck().get()).toBe('طباعة')
    expect(database.prepare(`SELECT COUNT(*) FROM inventory_items WHERE id LIKE 'inv-sublimation-%' AND package_enabled=1`).pluck().get()).toBe(2)
    expect(database.prepare(`SELECT package_enabled FROM inventory_items WHERE id='inv-ncr-invoice-a4'`).pluck().get()).toBe(0)
    database.close()
  })
})
