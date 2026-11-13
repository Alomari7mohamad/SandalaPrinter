import type Database from 'better-sqlite3'

// One-time transition: preserve the price previously used for new orders while
// making persisted pricing rules the only source of quantity pricing.
export function upgradeProductPriceTiers(database: Database.Database): void {
  if (Number(database.prepare("SELECT value FROM app_settings WHERE key='database.schemaVersion'").pluck().get()) >= 18) return
  database.transaction(() => {
    const products = database.prepare("SELECT id,regular_sale_price regular,offer_sale_price offer FROM services WHERE item_type='PRODUCT' AND regular_sale_price IS NOT NULL").all() as Array<{ id: string; regular: number; offer: number | null }>
    for (const product of products) {
      const rules = database.prepare('SELECT id,type,exact_quantity exact,min_quantity minimum,max_quantity maximum,sale_price fixed,sale_unit_price unit FROM pricing_rules WHERE service_id=? AND active=1').all(product.id) as Array<{ id: string; type: string; exact: number | null; minimum: number | null; maximum: number | null; fixed: number | null; unit: number | null }>
      const single = rules.length === 1 ? rules[0] : undefined
      const effective = product.offer ?? product.regular
      if (single && ['UNIT_PRICE', 'MIN_QUANTITY'].includes(single.type) && single.exact === null && (single.minimum ?? 1) <= 1 && single.maximum === null && single.fixed === null && single.unit !== null) {
        database.prepare('UPDATE pricing_rules SET sale_unit_price=? WHERE id=?').run(effective, single.id)
      } else {
        // Keep older, previously overridden rules available but inactive.
        database.prepare('UPDATE pricing_rules SET active=0 WHERE service_id=? AND active=1').run(product.id)
        database.prepare("INSERT INTO pricing_rules (id,service_id,type,min_quantity,max_quantity,sale_price,sale_unit_price,priority,active) VALUES (?,?,'UNIT_PRICE',1,NULL,NULL,?,10,1)").run(`product-tier:${product.id}`, product.id, effective)
      }
    }
    database.prepare("INSERT INTO app_settings (key,value) VALUES ('database.schemaVersion','18') ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP").run()
  })()
}
