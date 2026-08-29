import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import { seedCatalogInventorySync } from './catalog-inventory-sync.seed'

let database: Database.Database | undefined

afterEach(() => database?.close())

describe('catalog and inventory category synchronization', () => {
  it('creates one catalog product for every standalone inventory product under the same category', () => {
    database = new Database(':memory:')
    database.exec(`
      CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE service_categories (id TEXT PRIMARY KEY, name_ar TEXT, active INTEGER DEFAULT 1);
      CREATE TABLE services (id TEXT PRIMARY KEY, category_id TEXT, code TEXT UNIQUE, name_ar TEXT, name_he TEXT,
        material_type TEXT, size TEXT, color_mode TEXT, coverage TEXT, unit TEXT, item_type TEXT, supplier_id TEXT,
        reorder_point REAL, minimum_order_quantity REAL, cost_type TEXT, unit_cost REAL, cost_batch_size REAL,
        cost_calculation TEXT, sale_calculation TEXT, active INTEGER DEFAULT 1, notes TEXT, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE inventory_items (id TEXT PRIMARY KEY, name TEXT, sku TEXT, unit TEXT, purchase_cost REAL,
        supplier_id TEXT, reorder_point REAL, minimum_order_quantity REAL, category_id TEXT,
        catalog_service_id TEXT, active INTEGER DEFAULT 1, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
      INSERT INTO service_categories (id,name_ar) VALUES ('cat-printing','طباعة');
      INSERT INTO inventory_items (id,name,sku,unit,purchase_cost,reorder_point,minimum_order_quantity,category_id)
        VALUES ('inv-paper-a4','ورق A4','PAPER_A4','ورقة',0.075,499,1,'cat-printing');
    `)

    seedCatalogInventorySync(database)
    seedCatalogInventorySync(database)

    expect(database.prepare("SELECT COUNT(*) FROM services WHERE category_id='cat-printing' AND active=1").pluck().get()).toBe(1)
    expect(database.prepare("SELECT COUNT(*) FROM inventory_items WHERE category_id='cat-printing' AND active=1").pluck().get()).toBe(1)
    expect(database.prepare(`SELECT s.name_ar FROM inventory_items i JOIN services s ON s.id=i.catalog_service_id
      WHERE i.id='inv-paper-a4' AND s.category_id=i.category_id`).pluck().get()).toBe('ورق A4')
  })
})
