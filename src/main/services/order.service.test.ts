import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { seedGhassanProducts } from '../database/ghassan-products.seed'
import initialMigration from '../database/migrations/0000_initial.sql?raw'
import phaseTwoMigration from '../database/migrations/0001_phase2_cost_strategy.sql?raw'
import sandalaBrandMigration from '../database/migrations/0002_sandala_brand.sql?raw'
import orderDeliveryDetailsMigration from '../database/migrations/0003_order_delivery_details.sql?raw'
import orderPaidAtMigration from '../database/migrations/0004_order_paid_at.sql?raw'
import orderBusinessLogoMigration from '../database/migrations/0005_order_business_logo.sql?raw'
import bilingualServiceNamesMigration from '../database/migrations/0006_bilingual_service_names.sql?raw'
import unitCostOnlyMigration from '../database/migrations/0007_unit_cost_only.sql?raw'
import suppliersShortagesMigration from '../database/migrations/0008_suppliers_shortages.sql?raw'
import catalogInventoryProductsMigration from '../database/migrations/0009_catalog_inventory_products.sql?raw'
import inventoryPackagesMigration from '../database/migrations/0010_inventory_packages.sql?raw'
import inventoryCategoriesMigration from '../database/migrations/0011_inventory_categories.sql?raw'

const databaseState = vi.hoisted(() => ({ current: undefined as unknown as Database.Database }))

vi.mock('../database/client', () => ({ getSqlite: () => databaseState.current }))

import { orderService } from './order.service'

function createDatabase(): Database.Database {
  const database = new Database(':memory:')
  database.pragma('foreign_keys=ON')
  for (const migration of [initialMigration, phaseTwoMigration, sandalaBrandMigration, orderDeliveryDetailsMigration,
    orderPaidAtMigration, orderBusinessLogoMigration, bilingualServiceNamesMigration, unitCostOnlyMigration,
    suppliersShortagesMigration, catalogInventoryProductsMigration, inventoryPackagesMigration, inventoryCategoriesMigration]) database.exec(migration)
  seedGhassanProducts(database)
  return database
}

describe('إنشاء الطلب', () => {
  beforeEach(() => { databaseState.current = createDatabase() })
  afterEach(() => databaseState.current.close())

  it('يحفظ منتجًا سعر بيعه يساوي تكلفته دون رفض الربح الصفري', () => {
    const result = orderService.create({
      items: [{ serviceId: 'ghassan-product-078', quantity: 1 }],
      discountType: 'NONE', discountValue: 0, customerName: null, customerPhone: null,
      deliveryAddress: null, businessLogoDataUrl: null, notes: null
    })

    expect(result).toMatchObject({ orderNumber: 'ORD-000001', customerName: 'زبون عام', total: 9, totalCost: 9, profit: 0 })
    expect(databaseState.current.prepare('SELECT COUNT(*) FROM orders').pluck().get()).toBe(1)
    expect(databaseState.current.prepare('SELECT COUNT(*) FROM order_items').pluck().get()).toBe(1)
  })
})
