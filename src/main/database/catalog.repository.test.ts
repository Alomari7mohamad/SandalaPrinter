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

const databaseState = vi.hoisted(() => ({ current: undefined as unknown as Database.Database }))
vi.mock('./client', () => ({ getSqlite: () => databaseState.current }))

import { deleteCategory, listServices, saveCategory } from './catalog.repository'

function createDatabase(): Database.Database {
  const database = new Database(':memory:')
  database.pragma('foreign_keys=ON')
  for (const migration of [initialMigration, phaseTwoMigration, sandalaBrandMigration, orderDeliveryDetailsMigration,
    orderPaidAtMigration, orderBusinessLogoMigration, bilingualServiceNamesMigration, unitCostOnlyMigration,
    suppliersShortagesMigration, catalogInventoryProductsMigration, inventoryPackagesMigration, inventoryCategoriesMigration]) database.exec(migration)
  return database
}

describe('إدارة التصنيفات', () => {
  beforeEach(() => { databaseState.current = createDatabase() })
  afterEach(() => databaseState.current.close())

  it('يعدّل الاسم فيظهر مباشرة مع المنتجات التابعة له', () => {
    const category = saveCategory({ nameAr: 'تصنيف تجريبي' })
    databaseState.current.prepare("INSERT INTO services (id, category_id, code, name_ar, unit) VALUES ('test-product', ?, 'TEST-PRODUCT', 'منتج تجريبي', 'قطعة')").run(category.id)

    saveCategory({ id: category.id, nameAr: 'تصنيف مطوّر' })

    expect(listServices().find((service) => service.id === 'test-product')?.categoryName).toBe('تصنيف مطوّر')
  })

  it('يحذف التصنيف مع إبقاء المنتجات والمخزون دون تصنيف', () => {
    const category = saveCategory({ nameAr: 'تصنيف مؤقت' })
    databaseState.current.prepare("INSERT INTO services (id, category_id, code, name_ar, unit) VALUES ('kept-product', ?, 'KEPT-PRODUCT', 'منتج محفوظ', 'قطعة')").run(category.id)
    databaseState.current.prepare("INSERT INTO inventory_items (id, name, sku, category_id, unit, quantity) VALUES ('kept-stock', 'مخزون محفوظ', 'KEPT-STOCK', ?, 'قطعة', 4)").run(category.id)

    deleteCategory(category.id)

    expect(databaseState.current.prepare('SELECT active FROM service_categories WHERE id=?').pluck().get(category.id)).toBe(0)
    expect(databaseState.current.prepare("SELECT category_id FROM services WHERE id='kept-product'").pluck().get()).toBeNull()
    expect(databaseState.current.prepare("SELECT category_id FROM inventory_items WHERE id='kept-stock'").pluck().get()).toBeNull()
  })
})
