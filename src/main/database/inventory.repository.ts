import { randomUUID } from 'node:crypto'
import type { InventoryAdjustmentInput, InventoryItemDto, InventorySettingsInput } from '../../shared/contracts'
import { getSqlite } from './client'

interface InventoryRow extends Omit<InventoryItemDto, 'active'> { active: number }

export function listInventoryItems(): InventoryItemDto[] {
  const rows = getSqlite().prepare(`
    SELECT id, name, sku, unit, quantity, low_stock_threshold lowStockThreshold,
      purchase_cost purchaseCost, active, updated_at updatedAt
    FROM inventory_items WHERE active = 1 ORDER BY name
  `).all() as InventoryRow[]
  return rows.map((row) => ({ ...row, active: Boolean(row.active) }))
}

export function getInventoryItem(id: string): InventoryItemDto | undefined {
  return listInventoryItems().find((item) => item.id === id)
}

export function adjustInventory(input: InventoryAdjustmentInput): InventoryItemDto {
  const database = getSqlite()
  database.transaction(() => {
    const current = database.prepare(`SELECT quantity FROM inventory_items WHERE id = ? AND active = 1`).pluck().get(input.itemId) as number | undefined
    if (current === undefined) throw new Error('عنصر المخزون غير موجود.')
    const delta = input.type === 'ADD' ? input.quantity : -input.quantity
    const next = current + delta
    if (next < 0) throw new Error('لا يمكن سحب كمية أكبر من الرصيد الحالي.')
    database.prepare(`UPDATE inventory_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(next, input.itemId)
    database.prepare(`INSERT INTO inventory_transactions (id, inventory_item_id, type, quantity, notes, occurred_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(randomUUID(), input.itemId, input.type === 'ADD' ? 'IN' : 'OUT', input.quantity, input.notes, new Date().toISOString())
  })()
  const saved = getInventoryItem(input.itemId)
  if (!saved) throw new Error('تعذر تحديث المخزون.')
  return saved
}

export function updateInventorySettings(input: InventorySettingsInput): InventoryItemDto {
  const result = getSqlite().prepare(`UPDATE inventory_items SET low_stock_threshold = ?, purchase_cost = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND active = 1`)
    .run(input.lowStockThreshold, input.purchaseCost, input.itemId)
  if (result.changes === 0) throw new Error('عنصر المخزون غير موجود.')
  const saved = getInventoryItem(input.itemId)
  if (!saved) throw new Error('تعذر حفظ إعدادات المخزون.')
  return saved
}
