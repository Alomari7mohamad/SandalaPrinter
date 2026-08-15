import type Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { clearSalesData } from './sales-maintenance.service'

describe('clearSalesData', () => {
  it('يحذف بيانات المبيعات فقط وبالترتيب الآمن', () => {
    const executed: string[] = []
    const database = {
      prepare(sql: string) {
        if (sql === 'SELECT COUNT(*) FROM orders') return { pluck: () => ({ get: () => 2 }) }
        return { run: () => { executed.push(sql) } }
      },
      transaction(work: () => void) { return () => work() }
    } as unknown as Database.Database

    expect(clearSalesData(database)).toEqual({ ordersDeleted: 2 })
    expect(executed).toEqual([
      'DELETE FROM payments',
      'DELETE FROM order_items',
      'DELETE FROM orders'
    ])
  })
})
