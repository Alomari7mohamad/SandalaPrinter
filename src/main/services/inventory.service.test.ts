import { beforeEach, describe, expect, it, vi } from 'vitest'

const repository = vi.hoisted(() => ({
  listInventoryItems: vi.fn(() => []),
  listRawMaterialCategories:vi.fn(()=>[]),
  saveRawMaterialCategory:vi.fn(),
  deleteRawMaterialCategory:vi.fn(),
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

  it('يحفظ الاسم الجديد ضمن إعدادات المادة الخام', () => {
    inventoryService.updateSettings({ itemId: 'inv-paper-a4', name: 'ورق أبيض A4', lowStockThreshold: 500, purchaseCost: 0.024, supplierId: null, supplierIds: [], rawMaterialCategoryId: 'raw-category-paper', reorderPoint: 500, minimumOrderQuantity: 1, packageEnabled: true, packageName: 'رزمة', unitsPerPackage: 500, packagePrice: 12, packageNotes: null, reorderPackageCount: 1 })
    expect(repository.updateInventorySettings).toHaveBeenCalledWith(expect.objectContaining({ itemId: 'inv-paper-a4', name: 'ورق أبيض A4' }))
  })
})
