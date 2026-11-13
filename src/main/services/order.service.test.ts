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
import rawMaterialRecipesMigration from '../database/migrations/0013_raw_material_recipes.sql?raw'
import hierarchyMigration from '../database/migrations/0016_catalog_hierarchy.sql?raw'
import roundingMigration from '../database/migrations/0018_order_rounding.sql?raw'
import { getBusinessReport } from '../database/reports.repository'

const databaseState = vi.hoisted(() => ({ current: undefined as unknown as Database.Database }))

vi.mock('../database/client', () => ({ getSqlite: () => databaseState.current }))

import { orderService } from './order.service'

function createDatabase(withRounding = true): Database.Database {
  const database = new Database(':memory:')
  database.pragma('foreign_keys=ON')
  for (const migration of [initialMigration, phaseTwoMigration, sandalaBrandMigration, orderDeliveryDetailsMigration,
    orderPaidAtMigration, orderBusinessLogoMigration, bilingualServiceNamesMigration, unitCostOnlyMigration,
    suppliersShortagesMigration, catalogInventoryProductsMigration, inventoryPackagesMigration, inventoryCategoriesMigration, rawMaterialRecipesMigration]) database.exec(migration)
  seedGhassanProducts(database)
  database.exec(hierarchyMigration)
  if (withRounding) database.exec(roundingMigration)
  return database
}

describe('إنشاء الطلب', () => {
  beforeEach(() => { databaseState.current = createDatabase() })
  afterEach(() => databaseState.current.close())

  it.each([50.8,50.99,50.9999,51])('يحفظ المبلغ النهائي الصحيح والخصم المنفصل للسعر %s', (price) => {
    const db = databaseState.current
    db.prepare("UPDATE pricing_rules SET type='UNIT_PRICE',exact_quantity=NULL,min_quantity=1,max_quantity=NULL,sale_price=NULL,sale_unit_price=? WHERE service_id='ghassan-product-078'").run(price)
    const result = orderService.create({items:[{serviceId:'ghassan-product-078',quantity:1}],discountType:'NONE',discountValue:0,customerName:null,customerPhone:null,deliveryAddress:null,businessLogoDataUrl:null,notes:null})
    expect(result.total).toBe(Math.floor(price))
    expect(result.roundingDiscount).toBeCloseTo(price-Math.floor(price),4)
    const detail = orderService.get(result.id)
    expect(detail.total).toBe(result.total)
    expect(detail.roundingDiscount).toBe(result.roundingDiscount)
    expect(detail.items[0]?.totalSalePrice).toBe(price)
    expect(detail.profit).toBeCloseTo(result.total-detail.totalCost,4)
    orderService.setPaymentStatus(result.id,true)
    const paid = db.prepare('SELECT paid_amount paid,remaining_amount remaining FROM orders WHERE id=?').get(result.id)
    expect(paid).toEqual({paid:result.total,remaining:0})
    const report = getBusinessReport({from:'2000-01-01',to:'2100-12-31'})
    expect(report.summary.sales).toBe(result.total)
    expect(report.services.reduce((sum,row)=>sum+row.sales,0)).toBeCloseTo(result.total,4)
    expect(report.services.reduce((sum,row)=>sum+row.profit,0)).toBeCloseTo(detail.profit,4)
  })

  it('لا يغيّر المبالغ المدفوعة في الطلبات القديمة عند إضافة خصم الكسور', () => {
    const db = createDatabase(false)
    try {
      db.exec("INSERT INTO orders (id,order_number,ordered_at,subtotal,total,paid_amount,payment_status,profit) VALUES ('old','OLD',CURRENT_TIMESTAMP,50.99,50.99,50.99,'PAID',40.99)")
      db.exec(roundingMigration)
      expect(db.prepare("SELECT total,paid_amount paid,rounding_discount discount,profit FROM orders WHERE id='old'").get()).toEqual({total:50.99,paid:50.99,discount:0,profit:40.99})
    } finally { db.close() }
  })

  it('يسجل خصم المدير وخصم الكسور منفصلين وتتطابق تقارير الخدمات مع المبلغ المدفوع', () => {
    const db=databaseState.current
    db.prepare("UPDATE pricing_rules SET type='UNIT_PRICE',exact_quantity=NULL,min_quantity=1,max_quantity=NULL,sale_price=NULL,sale_unit_price=63.5 WHERE service_id='ghassan-product-078'").run()
    const result=orderService.create({items:[{serviceId:'ghassan-product-078',quantity:1}],discountType:'PERCENT',discountValue:20,customerName:null,customerPhone:null,deliveryAddress:null,businessLogoDataUrl:null,notes:null})
    expect(orderService.get(result.id)).toMatchObject({subtotal:63.5,discountAmount:12.7,roundingDiscount:0.8,total:50})
    orderService.setPaymentStatus(result.id,true)
    const report=getBusinessReport({from:'2000-01-01',to:'2100-12-31'})
    expect(report.summary.sales).toBe(50)
    expect(report.services[0]?.sales).toBeCloseTo(50,4)
    expect(report.services[0]?.profit).toBeCloseTo(result.profit,4)
  })

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

  it('يحفظ الطلب من دون تغيير المخزون المرتبط بالعنصر', () => {
    databaseState.current.prepare(`INSERT INTO inventory_items (id,name,sku,barcode,item_kind,unit,quantity,low_stock_threshold,purchase_cost,reorder_point,minimum_order_quantity,active)
      VALUES ('raw-paper','ورق A4','RAW-A4','123','RAW_MATERIAL','ورقة',1000,100,0.024,100,1,1)`).run()
    databaseState.current.prepare(`INSERT INTO service_material_requirements (service_id,inventory_item_id,quantity_per_unit) VALUES ('ghassan-product-078','raw-paper',50)`).run()
    orderService.create({items:[{serviceId:'ghassan-product-078',quantity:3}],discountType:'NONE',discountValue:0,customerName:null,customerPhone:null,deliveryAddress:null,businessLogoDataUrl:null,notes:null})
    expect(databaseState.current.prepare("SELECT quantity FROM inventory_items WHERE id='raw-paper'").pluck().get()).toBe(1000)
    expect(databaseState.current.prepare("SELECT quantity FROM inventory_transactions WHERE inventory_item_id='raw-paper' AND reference_type='ORDER'").pluck().get()).toBeUndefined()
  })
})
