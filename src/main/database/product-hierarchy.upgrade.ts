import type Database from 'better-sqlite3'
import { sheetProducts } from './product-sheet.data'

// Main headings and secondary categories are taken from the owner's price sheet.
export const sheetCategoryGroups = [
  { nameAr: 'اطارات براويز وشهادات', children: ['اطارات', 'براويز', 'شهادات'] },
  { nameAr: 'دروع', children: ['دروع'] },
  { nameAr: 'كاسات سبليميشن مطرات وتيرموسات', children: ['كاسات', 'تيرموس', 'مطرات'] },
  { nameAr: 'اكياس ومنتجات اقمشة', children: ['اكياس', 'اقمشة'] },
  { nameAr: 'هدايا وصور', children: ['هدايا'] }
]

export function upgradeProductHierarchy(database: Database.Database): void {
  for (const [index, group] of sheetCategoryGroups.entries()) {
    const parentId = `sheet-main-${index + 1}`
    database.prepare("INSERT INTO service_categories (id,code,name_ar,item_type,sort_order) VALUES (?,?,?,'PRODUCT',?)").run(parentId,`SHEET_MAIN_${index + 1}`,group.nameAr,100+index)
    for (const name of group.children) {
      database.prepare("UPDATE service_categories SET parent_id=? WHERE name_ar=? AND item_type='PRODUCT' AND id<>? AND active=1").run(parentId,name,parentId)
    }
  }

  // Preserve the current effective unit price, including later manual changes.
  const products = database.prepare("SELECT id FROM services WHERE item_type='PRODUCT'").all() as Array<{id:string}>
  for (const product of products) {
    const rules = database.prepare('SELECT id,type,sale_unit_price unitPrice,min_quantity minQuantity,max_quantity maxQuantity FROM pricing_rules WHERE service_id=? AND active=1').all(product.id) as Array<{id:string;type:string;unitPrice:number|null;minQuantity:number|null;maxQuantity:number|null}>
    const rule = rules[0]
    if (rules.length !== 1 || !rule || rule.type !== 'UNIT_PRICE' || rule.unitPrice === null || (rule.minQuantity ?? 1) > 1 || rule.maxQuantity !== null) continue
    const source = sheetProducts.find((row) => `sheet-price-${row.key}` === rule.id)
    database.prepare('UPDATE services SET regular_sale_price=?,offer_sale_price=? WHERE id=?').run(source?.regularSalePrice ?? rule.unitPrice,source ? rule.unitPrice : null,product.id)
  }
}
