import Database from 'better-sqlite3'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { recoverLegacyInventoryData } from './legacy-data-recovery'

const directories: string[] = []

function createDatabase(path: string): Database.Database {
  const database = new Database(path)
  database.exec(`
    CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE suppliers (id TEXT PRIMARY KEY, name TEXT, company_name TEXT, whatsapp_phone TEXT, product_types TEXT, active INTEGER DEFAULT 1, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE services (id TEXT PRIMARY KEY, supplier_id TEXT, active INTEGER DEFAULT 1, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE inventory_items (id TEXT PRIMARY KEY, quantity REAL DEFAULT 0, low_stock_threshold REAL DEFAULT 0, purchase_cost REAL DEFAULT 0,
      supplier_id TEXT, reorder_point REAL DEFAULT 1, minimum_order_quantity REAL DEFAULT 1, package_enabled INTEGER DEFAULT 0,
      package_name TEXT, units_per_package REAL, package_price REAL, package_notes TEXT, reorder_package_count REAL,
      active INTEGER DEFAULT 1, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
  `)
  return database
}

afterEach(() => {
  while (directories.length) rmSync(directories.pop()!, { recursive: true, force: true })
})

describe('legacy inventory recovery', () => {
  it('restores missing suppliers, quantities, links, and package purchasing without overwriting newer values', () => {
    const directory = mkdtempSync(join(tmpdir(), 'sandala-recovery-'))
    directories.push(directory)
    const legacyPath = join(directory, 'legacy.db')
    const currentPath = join(directory, 'current.db')
    const legacy = createDatabase(legacyPath)
    const current = createDatabase(currentPath)

    legacy.prepare('INSERT INTO suppliers (id,name,company_name,whatsapp_phone,product_types) VALUES (?,?,?,?,?)')
      .run('supplier-old', 'قبلاوي', 'قبلاوي', '0522690239', 'ورق وتجليد')
    legacy.prepare(`INSERT INTO inventory_items (id,quantity,low_stock_threshold,purchase_cost,supplier_id,reorder_point,
      minimum_order_quantity,package_enabled,package_name,units_per_package,package_price,package_notes,reorder_package_count)
      VALUES ('inv-paper-a4',4000,499,0.075,'supplier-old',499,1,1,'رزمة',500,12,'بالرزمة',1)`).run()
    legacy.prepare("INSERT INTO services (id,supplier_id) VALUES ('product-red-glue','supplier-old')").run()
    legacy.close()

    current.prepare("INSERT INTO inventory_items (id,quantity,purchase_cost) VALUES ('inv-paper-a4',0,0.09)").run()
    current.prepare("INSERT INTO services (id,supplier_id) VALUES ('product-red-glue',NULL)").run()
    recoverLegacyInventoryData(current, legacyPath, currentPath)

    expect(current.prepare('SELECT company_name FROM suppliers WHERE active=1').pluck().all()).toEqual(['قبلاوي'])
    expect(current.prepare(`SELECT quantity, purchase_cost purchaseCost, supplier_id supplierId,
      package_enabled packageEnabled, units_per_package unitsPerPackage, package_price packagePrice
      FROM inventory_items WHERE id='inv-paper-a4'`).get()).toMatchObject({
      quantity: 4000, purchaseCost: 0.09, supplierId: 'supplier-old', packageEnabled: 1, unitsPerPackage: 500, packagePrice: 12
    })
    expect(current.prepare("SELECT supplier_id FROM services WHERE id='product-red-glue'").pluck().get()).toBe('supplier-old')

    current.prepare("UPDATE inventory_items SET quantity=125 WHERE id='inv-paper-a4'").run()
    recoverLegacyInventoryData(current, legacyPath, currentPath)
    expect(current.prepare("SELECT quantity FROM inventory_items WHERE id='inv-paper-a4'").pluck().get()).toBe(125)
    current.close()
  })
})
