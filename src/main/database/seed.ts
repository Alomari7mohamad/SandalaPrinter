import type Database from 'better-sqlite3'
import { coreCategories, corePricingRules, coreServices } from './seed-data'

export function seedCorePricingData(database: Database.Database): void {
  const currentVersion = database.prepare("SELECT value FROM app_settings WHERE key = 'seed.corePricingVersion'").pluck().get()
  if (currentVersion === '2') return

  const insertCategory = database.prepare(`INSERT OR IGNORE INTO service_categories (id, code, name_ar, active, sort_order) VALUES (?, ?, ?, 1, ?)`)
  const insertService = database.prepare(`
    INSERT OR IGNORE INTO services
    (id, category_id, code, name_ar, material_type, size, color_mode, coverage, unit, cost_type, unit_cost, cost_batch_size, cost_calculation, sale_calculation, active, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COST_STRATEGY', 'PRICING_RULE', ?, ?)
  `)
  const insertRule = database.prepare(`
    INSERT OR IGNORE INTO pricing_rules
    (id, service_id, type, min_quantity, max_quantity, exact_quantity, sale_price, sale_unit_price, priority, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const saveVersion = database.prepare(`INSERT INTO app_settings (key, value, updated_at) VALUES ('seed.corePricingVersion', '2', CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = '2', updated_at = CURRENT_TIMESTAMP`)

  database.transaction(() => {
    for (const category of coreCategories) insertCategory.run(category.id, category.code, category.nameAr, category.sortOrder)
    for (const service of coreServices) {
      insertService.run(service.id, service.categoryId, service.code, service.nameAr, service.paperType, service.size, service.colorMode, service.coverage, service.unit, service.costType, service.unitCost, service.costBatchSize, service.active ? 1 : 0, service.notes)
    }
    for (const rule of corePricingRules) {
      insertRule.run(rule.id, rule.serviceId, rule.ruleType, rule.minQuantity, rule.maxQuantity, rule.exactQuantity, rule.fixedPrice, rule.unitPrice, rule.priority, rule.active ? 1 : 0)
    }
    saveVersion.run()
  })()
}
