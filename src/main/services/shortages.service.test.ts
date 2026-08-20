import { beforeEach, describe, expect, it, vi } from 'vitest'

const repository = vi.hoisted(() => ({
  listSuppliers: vi.fn(() => []),
  saveSupplier: vi.fn((input) => ({ ...input, id: input.id ?? 'supplier-1', active: true, productCount: 0 })),
  listRequests: vi.fn(() => []),
  saveRequest: vi.fn((input) => input),
  deleteRequest: vi.fn(),
  getSupplier: vi.fn()
}))

vi.mock('../database/shortages.repository', () => repository)

import { shortagesService } from './shortages.service'

describe('خدمة النواقص والطلبيات', () => {
  beforeEach(() => vi.clearAllMocks())

  it('تحفظ بيانات التاجر ورقم واتساب صالحًا', () => {
    const saved = shortagesService.saveSupplier({
      name: 'محمد التاجر',
      companyName: 'شركة الورق',
      whatsappPhone: '972501234567',
      productTypes: 'ورق ومستلزمات طباعة'
    })

    expect(saved.id).toBe('supplier-1')
    expect(repository.saveSupplier).toHaveBeenCalledOnce()
  })

  it('ترفض رقم واتساب غير صالح', () => {
    expect(() => shortagesService.saveSupplier({
      name: 'محمد التاجر',
      companyName: 'شركة الورق',
      whatsappPhone: '050-abc',
      productTypes: null
    })).toThrow('رقم واتساب غير صالح')
  })

  it('ترفض كمية طلب غير موجبة', () => {
    expect(() => shortagesService.saveRequest({
      inventoryItemId: 'inventory-1',
      requestedQuantity: 0,
      unitPrice: 2
    })).toThrow()
  })
})
