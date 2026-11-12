import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
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
import { seedGhassanProducts } from './ghassan-products.seed'
import { importProductSheet } from './product-sheet.import'
import hierarchyMigration from './migrations/0016_catalog_hierarchy.sql?raw'
import { upgradeProductHierarchy } from './product-hierarchy.upgrade'
import { sheetProducts } from './product-sheet.data'
import { calculatePrice } from '../../shared/pricing/pricing-engine'
import type { PriceRule } from '../../shared/pricing/pricing-types'

let database: Database.Database

beforeEach(() => {
  database = new Database(':memory:')
  database.pragma('foreign_keys=ON')
  for (const migration of [initialMigration, phaseTwoMigration, sandalaBrandMigration, orderDeliveryDetailsMigration,
    orderPaidAtMigration, orderBusinessLogoMigration, bilingualServiceNamesMigration, unitCostOnlyMigration,
    suppliersShortagesMigration, catalogInventoryProductsMigration, inventoryPackagesMigration, inventoryCategoriesMigration]) database.exec(migration)
  seedGhassanProducts(database)
  database.exec(typedCatalogMigration)
  database.exec(`
    INSERT INTO service_categories (id,code,name_ar,item_type) VALUES ('printing','PRINTING','طباعة','SERVICE');
    INSERT INTO services (id,code,name_ar,category_id,unit,unit_cost) VALUES ('print-service','PRINT','طباعة','printing','ورقة',0.1);
    INSERT INTO pricing_rules (id,service_id,type,min_quantity,sale_unit_price) VALUES ('print-price','print-service','UNIT_PRICE',1,0.5);
    INSERT INTO orders (id,order_number,ordered_at,total) VALUES ('old-order','ORD-OLD',CURRENT_TIMESTAMP,9);
    INSERT INTO order_items (id,order_id,service_id,service_code_snapshot,service_name_snapshot,unit_snapshot,quantity,unit_cost_snapshot,total_cost,total_sale_price,profit,profit_margin)
      VALUES ('old-line','old-order','ghassan-product-078','OLD','برواز قديم','قطعة',1,9,9,9,0,0);
  `)
})

afterEach(() => database.close())

describe('owner product price sheet', () => {
  it('ينقل فئات الجدول تحت العناوين الرئيسية الخمسة ويحتفظ بتعديل سعر لاحق', () => {
    importProductSheet(database)
    database.exec("UPDATE pricing_rules SET sale_unit_price=39 WHERE id='sheet-price-001'")
    database.transaction(() => {
      database.exec(hierarchyMigration)
      upgradeProductHierarchy(database)
    })()
    expect(database.prepare("SELECT COUNT(*) FROM service_categories WHERE id LIKE 'sheet-main-%' AND parent_id IS NULL AND item_type='PRODUCT'").pluck().get()).toBe(5)
    expect(database.prepare("SELECT COUNT(*) FROM service_categories WHERE parent_id LIKE 'sheet-main-%' AND active=1").pluck().get()).toBe(10)
    expect(database.prepare("SELECT regular_sale_price,offer_sale_price,unit_cost FROM services WHERE id='ghassan-product-067'").get())
      .toEqual({regular_sale_price:45,offer_sale_price:39,unit_cost:20})
    expect(database.prepare("SELECT total FROM orders WHERE id='old-order'").pluck().get()).toBe(9)
    expect(database.pragma('foreign_key_check')).toEqual([])
  })
  it('imports all 57 rows into 10 product categories and uses each offer price', () => {
    expect(sheetProducts).toHaveLength(57)
    expect(new Set(sheetProducts.map((product) => product.category)).size).toBe(10)
    importProductSheet(database)
    expect(database.prepare("SELECT COUNT(*) FROM services WHERE item_type='PRODUCT'").pluck().get()).toBe(86)
    expect(database.prepare("SELECT COUNT(*) FROM pricing_rules WHERE id LIKE 'sheet-price-%' AND active=1").pluck().get()).toBe(57)

    for (const product of sheetProducts) {
      const record = database.prepare(`SELECT s.id,s.name_ar nameAr,s.item_type itemType,s.unit_cost unitCost,
        c.name_ar categoryName,c.item_type categoryType,s.notes,r.sale_unit_price salePrice
        FROM services s JOIN service_categories c ON c.id=s.category_id JOIN pricing_rules r ON r.service_id=s.id
        WHERE r.id=?`).get(`sheet-price-${product.key}`) as Record<string, unknown>
      expect(record).toMatchObject({
        nameAr: product.nameAr, itemType: 'PRODUCT', unitCost: product.unitCost,
        categoryName: product.category, categoryType: 'PRODUCT',
        salePrice: product.offerSalePrice ?? product.regularSalePrice
      })
      expect(record.notes).toContain(`سعر البيع الأصلي: ${product.regularSalePrice} ₪`)
      if (product.legacyId) expect(record.id).toBe(product.legacyId)
    }

    expect(database.prepare("SELECT unit_cost FROM services WHERE id='print-service'").pluck().get()).toBe(0.1)
    expect(database.prepare("SELECT sale_unit_price FROM pricing_rules WHERE id='print-price'").pluck().get()).toBe(0.5)
    expect(database.prepare("SELECT service_id,total_sale_price FROM order_items WHERE id='old-line'").get())
      .toEqual({service_id:'ghassan-product-078',total_sale_price:9})
    expect(database.prepare("SELECT total FROM orders WHERE id='old-order'").pluck().get()).toBe(9)
    expect(database.pragma('foreign_key_check')).toEqual([])
  })

  it('keeps later edits and deletions when the app restarts', () => {
    importProductSheet(database)
    database.exec("UPDATE services SET unit_cost=99 WHERE id='ghassan-product-067'; DELETE FROM pricing_rules WHERE service_id='sheet-product-027'; DELETE FROM services WHERE id='sheet-product-027'")
    importProductSheet(database)
    expect(database.prepare("SELECT unit_cost FROM services WHERE id='ghassan-product-067'").pluck().get()).toBe(99)
    expect(database.prepare("SELECT id FROM services WHERE id='sheet-product-027'").get()).toBeUndefined()
  })

  it('falls back to regular price when there is no offer and supports a zero offer', () => {
    importProductSheet(database, [{ ...sheetProducts[0]!, offerSalePrice: null }, { ...sheetProducts[1]!, offerSalePrice: 0 }])
    expect(database.prepare("SELECT sale_unit_price FROM pricing_rules WHERE id='sheet-price-001'").pluck().get()).toBe(45)
    expect(database.prepare("SELECT sale_unit_price FROM pricing_rules WHERE id='sheet-price-002'").pluck().get()).toBe(0)
  })

  it('rolls back the import on conflicting matches without touching historical data', () => {
    database.prepare("INSERT INTO services (id,code,name_ar,unit,item_type) VALUES ('conflict','7-3509','عنصر آخر','قطعة','PRODUCT')").run()
    expect(() => importProductSheet(database)).toThrow('تعارض')
    expect(database.prepare("SELECT COUNT(*) FROM pricing_rules WHERE id LIKE 'sheet-price-%'").pluck().get()).toBe(0)
    expect(database.prepare("SELECT value FROM app_settings WHERE key='import.productSheetVersion'").get()).toBeUndefined()
    expect(database.prepare("SELECT total FROM orders WHERE id='old-order'").pluck().get()).toBe(9)
  })

  it('calculates the order sale and profit from the imported offer and cost', () => {
    importProductSheet(database)
    const product = database.prepare(`SELECT id,code,name_ar nameAr,unit_cost unitCost,cost_type costType,cost_batch_size costBatchSize,active FROM services WHERE id='ghassan-product-067'`).get() as {id:string;code:string;nameAr:string;unitCost:number;costType:'PER_UNIT';costBatchSize:null;active:number}
    const rule = database.prepare(`SELECT id,service_id serviceId,type ruleType,min_quantity minQuantity,max_quantity maxQuantity,exact_quantity exactQuantity,sale_price fixedPrice,sale_unit_price unitPrice,priority,active FROM pricing_rules WHERE id='sheet-price-001'`).get() as Omit<PriceRule,'active'>&{active:number}
    expect(calculatePrice({...product,active:Boolean(product.active)},[{...rule,active:Boolean(rule.active)}],3))
      .toMatchObject({ salePrice:120,cost:60,profit:60,requiresManualPricing:false })
  })
})
