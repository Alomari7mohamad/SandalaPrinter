import { describe, expect, it } from 'vitest'
import type { InventoryItemDto } from '../../../shared/contracts'
import { getInventoryAlerts } from './inventory-alerts'

const item = (id: string, quantity: number, lowStockThreshold: number): InventoryItemDto => ({
  id, name: id, sku: id, unit: 'قطعة', quantity, lowStockThreshold, purchaseCost: 0,
  supplierId: null, supplierName: null, reorderPoint: 1, minimumOrderQuantity: 1,
  catalogServiceId: null,
  active: true, updatedAt: ''
})

describe('تنبيهات المخزون', () => {
  it('تعرض النافد والمنخفض فقط وتضع النافد أولاً', () => {
    expect(getInventoryAlerts([item('جيد', 20, 5), item('منخفض', 5, 5), item('نافد', 0, 0)]).map(({ id, alertType }) => ({ id, alertType })))
      .toEqual([{ id: 'نافد', alertType: 'out' }, { id: 'منخفض', alertType: 'low' }])
  })
})
