import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

import typedCatalogMigration from './migrations/0015_typed_catalog.sql?raw'

const databaseState = vi.hoisted(() => ({ current: undefined as unknown as Database.Database }))
vi.mock('./client', () => ({ getSqlite: () => databaseState.current }))

import { deleteCategory, deleteService, listServices, saveCategory, saveService } from './catalog.repository'

function createDatabase(upgrade = true): Database.Database {
  const database = new Database(':memory:')
  database.pragma('foreign_keys=ON')
  for (const migration of [initialMigration, phaseTwoMigration, sandalaBrandMigration, orderDeliveryDetailsMigration,
    orderPaidAtMigration, orderBusinessLogoMigration, bilingualServiceNamesMigration, unitCostOnlyMigration,
    suppliersShortagesMigration, catalogInventoryProductsMigration, inventoryPackagesMigration, inventoryCategoriesMigration]) database.exec(migration)
  if (upgrade) database.exec(typedCatalogMigration)
  return database
}

describe('إدارة التصنيفات', () => {
  beforeEach(() => { databaseState.current = createDatabase() })
  afterEach(() => databaseState.current.close())

  it.each(['PRODUCT', 'SERVICE'] as const)('يحذف %s من الكتالوج مع إبقاء تفاصيل الطلب السابق', (itemType) => {
    const db = databaseState.current
    db.prepare("INSERT INTO services (id, code, name_ar, unit, item_type) VALUES ('deleted-item', 'DELETED', 'عنصر تجريبي', 'قطعة', ?)").run(itemType)
    db.exec(`
      INSERT INTO orders (id, order_number, ordered_at) VALUES ('kept-order', 'ORD-KEPT', CURRENT_TIMESTAMP);
      INSERT INTO order_items (id, order_id, service_id, service_code_snapshot, service_name_snapshot, unit_snapshot, quantity, unit_cost_snapshot, total_cost, total_sale_price, profit, profit_margin)
        VALUES ('kept-line', 'kept-order', 'deleted-item', 'DELETED', 'عنصر تجريبي', 'قطعة', 1, 5, 5, 10, 5, 50);
    `)

    deleteService('deleted-item')

    expect(listServices().some((item) => item.id === 'deleted-item')).toBe(false)
    expect(db.prepare("SELECT service_id, service_name_snapshot, total_sale_price FROM order_items WHERE id='kept-line'").get())
      .toEqual({ service_id: null, service_name_snapshot: 'عنصر تجريبي', total_sale_price: 10 })
  })

  it('يفصل التصنيف المختلط مع بقاء معرّفات العناصر والأسعار والطلبات السابقة', () => {
    const db = createDatabase(false)
    try {
      db.exec(`
        INSERT INTO service_categories (id, code, name_ar) VALUES ('mixed', 'MIXED', 'براويز');
        INSERT INTO services (id, category_id, code, name_ar, unit, unit_cost) VALUES
          ('print-frames', 'mixed', 'PRINT_FRAMES', 'طباعة برواز', 'قطعة', 3),
          ('product-frame', 'mixed', 'FRAME', 'برواز', 'قطعة', 5);
        INSERT INTO pricing_rules (id, service_id, type, sale_unit_price)
          VALUES ('frame-price', 'product-frame', 'UNIT_PRICE', 10);
        INSERT INTO orders (id, order_number, ordered_at) VALUES ('previous-order', 'ORD-PREVIOUS', CURRENT_TIMESTAMP);
        INSERT INTO order_items (id, order_id, service_id, service_code_snapshot, service_name_snapshot, category_snapshot, unit_snapshot, quantity, unit_cost_snapshot, total_cost, total_sale_price, profit, profit_margin)
          VALUES ('previous-item', 'previous-order', 'product-frame', 'FRAME', 'برواز', 'براويز', 'قطعة', 1, 5, 5, 10, 5, 50);
      `)
      db.transaction(() => db.exec(typedCatalogMigration))()
      expect(db.prepare("SELECT id, item_type FROM service_categories WHERE name_ar='براويز' ORDER BY item_type").all())
        .toEqual([{ id: 'typed-products:mixed', item_type: 'PRODUCT' }, { id: 'mixed', item_type: 'SERVICE' }])
      expect(db.prepare("SELECT category_id, unit_cost FROM services WHERE id='product-frame'").get())
        .toEqual({ category_id: 'typed-products:mixed', unit_cost: 5 })
      expect(db.prepare("SELECT service_id, sale_unit_price FROM pricing_rules WHERE id='frame-price'").get())
        .toEqual({ service_id: 'product-frame', sale_unit_price: 10 })
      expect(db.prepare("SELECT service_id, category_snapshot, total_sale_price FROM order_items WHERE id='previous-item'").get())
        .toEqual({ service_id: 'product-frame', category_snapshot: 'براويز', total_sale_price: 10 })
      expect(db.pragma('foreign_key_check')).toEqual([])
    } finally {
      db.close()
    }
  })

  it('يغيّر نوع التصنيف وعناصره مع بقاء ارتباطها بالتصنيف', () => {
    const category = saveCategory({ nameAr: 'تجريبي', itemType: 'PRODUCT' })
    databaseState.current.prepare("INSERT INTO services (id, category_id, code, name_ar, unit, item_type) VALUES ('typed-item', ?, 'TYPED_ITEM', 'عنصر', 'قطعة', 'PRODUCT')").run(category.id)
    saveCategory({ id: category.id, nameAr: category.nameAr, itemType: 'SERVICE' })
    expect(listServices().find((item) => item.id === 'typed-item')).toMatchObject({ itemType: 'SERVICE', categoryId: category.id })
  })

  it('يعدّل الاسم فيظهر مباشرة مع الخدمات التابعة له', () => {
    const category = saveCategory({ nameAr: 'تصنيف تجريبي' })
    databaseState.current.prepare("INSERT INTO services (id, category_id, code, name_ar, unit) VALUES ('test-product', ?, 'TEST-PRODUCT', 'منتج تجريبي', 'قطعة')").run(category.id)

    saveCategory({ id: category.id, nameAr: 'تصنيف مطوّر' })

    expect(listServices().find((service) => service.id === 'test-product')?.categoryName).toBe('تصنيف مطوّر')
  })

  it('يحذف تصنيف الخدمة دون تغيير تصنيف المخزون المستقل', () => {
    const category = saveCategory({ nameAr: 'تصنيف مؤقت' })
    databaseState.current.prepare("INSERT INTO services (id, category_id, code, name_ar, unit) VALUES ('kept-product', ?, 'KEPT-PRODUCT', 'منتج محفوظ', 'قطعة')").run(category.id)
    databaseState.current.prepare("INSERT INTO inventory_items (id, name, sku, category_id, unit, quantity) VALUES ('kept-stock', 'مخزون محفوظ', 'KEPT-STOCK', ?, 'قطعة', 4)").run(category.id)

    deleteCategory(category.id)

    expect(databaseState.current.prepare('SELECT active FROM service_categories WHERE id=?').pluck().get(category.id)).toBe(0)
    expect(databaseState.current.prepare("SELECT category_id FROM services WHERE id='kept-product'").pluck().get()).toBeNull()
    expect(databaseState.current.prepare("SELECT category_id FROM inventory_items WHERE id='kept-stock'").pluck().get()).toBe(category.id)
  })

  it('يفصل تكلفة تنفيذ الخدمة عن تكلفة شراء مادتها وتاجرها', () => {
    const category = saveCategory({ nameAr: 'طباعة' })
    databaseState.current.prepare("INSERT INTO suppliers (id,name,company_name,whatsapp_phone) VALUES ('paper-supplier','أحمد','ورق أحمد','0500000000')").run()
    databaseState.current.prepare("INSERT INTO services (id,category_id,code,name_ar,unit,item_type,supplier_id,unit_cost) VALUES ('paper-print',?,'PAPER_PRINT','طباعة ورق','ورقة','PRODUCT','paper-supplier',2)").run(category.id)
    databaseState.current.prepare("INSERT INTO inventory_items (id,name,unit,quantity,purchase_cost,supplier_id,catalog_service_id) VALUES ('paper-stock','ورق A4','ورقة',500,0.024,'paper-supplier','paper-print')").run()

    saveService({ id: 'paper-print', code: 'PAPER_PRINT', nameAr: 'طباعة ورق', nameHe: null, categoryId: category.id, paperType: null, size: 'A4', colorMode: null, coverage: null, unit: 'ورقة', itemType: 'SERVICE', supplierId: null, reorderPoint: 1, minimumOrderQuantity: 1, costType: 'PER_UNIT', unitCost: 1.25, costBatchSize: null, active: true, notes: null })

    expect(databaseState.current.prepare("SELECT unit_cost FROM services WHERE id='paper-print'").pluck().get()).toBe(1.25)
    expect(databaseState.current.prepare("SELECT purchase_cost FROM inventory_items WHERE id='paper-stock'").pluck().get()).toBe(0.024)
    expect(databaseState.current.prepare("SELECT supplier_id FROM inventory_items WHERE id='paper-stock'").pluck().get()).toBe('paper-supplier')
  })
})
