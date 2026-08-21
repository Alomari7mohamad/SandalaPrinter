import { beforeEach, describe, expect, it, vi } from 'vitest'

const repository = vi.hoisted(() => ({
  listInventoryItems: vi.fn(() => []),
  adjustInventory: vi.fn(),
  updateInventorySettings: vi.fn(),
  createInventoryItem: vi.fn(),
  deleteInventoryItem: vi.fn()
}))

vi.mock('../database/inventory.repository', () => repository)

import { inventoryService } from './inventory.service'

describe('حذف منتج المخزون', () => {
  beforeEach(() => vi.clearAllMocks())

  it('يقبل معرّفات المنتجات الأساسية ويحذف المنتج', () => {
    inventoryService.deleteItem('inv-paper-a4')
    expect(repository.deleteInventoryItem).toHaveBeenCalledWith('inv-paper-a4')
  })

  it('يرفض المعرّف الفارغ أو غير الصالح', () => {
    expect(() => inventoryService.deleteItem(' ')).toThrow()
    expect(repository.deleteInventoryItem).not.toHaveBeenCalled()
  })
})
