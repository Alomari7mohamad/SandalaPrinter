import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { app } from 'electron'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import * as schema from './schema'
import initialMigration from './migrations/0000_initial.sql?raw'
import phaseTwoMigration from './migrations/0001_phase2_cost_strategy.sql?raw'
import sandalaBrandMigration from './migrations/0002_sandala_brand.sql?raw'
import orderDeliveryDetailsMigration from './migrations/0003_order_delivery_details.sql?raw'
import orderPaidAtMigration from './migrations/0004_order_paid_at.sql?raw'
import orderBusinessLogoMigration from './migrations/0005_order_business_logo.sql?raw'
import bilingualServiceNamesMigration from './migrations/0006_bilingual_service_names.sql?raw'
import unitCostOnlyMigration from './migrations/0007_unit_cost_only.sql?raw'
import suppliersShortagesMigration from './migrations/0008_suppliers_shortages.sql?raw'
import { seedCorePricingData } from './seed'
import { seedInventoryItems } from './inventory.seed'

let sqlite: Database.Database | undefined

export function getDatabasePath(): string {
  return join(app.getPath('userData'), 'data', 'oh-printer-manager.db')
}

export function initializeDatabase() {
  const databasePath = getDatabasePath()
  mkdirSync(dirname(databasePath), { recursive: true })
  sqlite = new Database(databasePath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  sqlite.pragma('busy_timeout = 5000')

  sqlite.exec(initialMigration)
  const schemaVersion = Number(sqlite.prepare("SELECT value FROM app_settings WHERE key = 'database.schemaVersion'").pluck().get() ?? 1)
  if (schemaVersion < 2) {
    sqlite.transaction(() => sqlite?.exec(phaseTwoMigration))()
  }
  if (schemaVersion < 3) {
    sqlite.transaction(() => sqlite?.exec(sandalaBrandMigration))()
  }
  if (schemaVersion < 4) {
    sqlite.transaction(() => sqlite?.exec(orderDeliveryDetailsMigration))()
  }
  if (schemaVersion < 5) {
    sqlite.transaction(() => sqlite?.exec(orderPaidAtMigration))()
  }
  if (schemaVersion < 6) {
    sqlite.transaction(() => sqlite?.exec(orderBusinessLogoMigration))()
  }
  if (schemaVersion < 7) {
    sqlite.transaction(() => sqlite?.exec(bilingualServiceNamesMigration))()
  }
  if (schemaVersion < 8) {
    sqlite.transaction(() => sqlite?.exec(unitCostOnlyMigration))()
  }
  if (schemaVersion < 9) {
    sqlite.transaction(() => sqlite?.exec(suppliersShortagesMigration))()
  }
  seedCorePricingData(sqlite)
  seedInventoryItems(sqlite)
  return drizzle(sqlite, { schema })
}

export function getSqlite(): Database.Database {
  if (!sqlite) throw new Error('Database has not been initialized')
  return sqlite
}

export function closeDatabase(): void {
  sqlite?.close()
  sqlite = undefined
}
