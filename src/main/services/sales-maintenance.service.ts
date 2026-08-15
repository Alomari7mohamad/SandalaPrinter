import type Database from 'better-sqlite3'
import { getSqlite } from '../database/client'

export interface ClearSalesResult {
  ordersDeleted: number
}

export function clearSalesData(database: Database.Database = getSqlite()): ClearSalesResult {
  const ordersDeleted = database.prepare('SELECT COUNT(*) FROM orders').pluck().get() as number

  database.transaction(() => {
    database.prepare('DELETE FROM payments').run()
    database.prepare('DELETE FROM order_items').run()
    database.prepare('DELETE FROM orders').run()
  })()

  return { ordersDeleted }
}
