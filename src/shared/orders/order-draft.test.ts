import { describe, expect, it } from 'vitest'
import { calculateDraftTotals } from './order-draft'

describe('calculateDraftTotals', () => {
  it('يجمع عدة خدمات بدقة ويحسب هامش الربح', () => {
    expect(calculateDraftTotals([{ salePrice: 4, cost: 0.75 }, { salePrice: 30, cost: 8 }])).toEqual({ subtotal: 34, discountAmount: 0, total: 34, totalCost: 8.75, profit: 25.25, profitMargin: 74.2647 })
  })
  it('يتعامل مع الطلب الفارغ بأمان', () => expect(calculateDraftTotals([])).toEqual({ subtotal: 0, discountAmount: 0, total: 0, totalCost: 0, profit: 0, profitMargin: 0 }))
  it('يحسب خصم النسبة ويؤثر في الربح', () => expect(calculateDraftTotals([{ salePrice: 100, cost: 40 }], { type: 'PERCENT', value: 20 })).toEqual({ subtotal: 100, discountAmount: 20, total: 80, totalCost: 40, profit: 40, profitMargin: 50 }))
  it('يحسب الخصم الثابت ولا يسمح بتجاوز قيمة الطلب', () => expect(calculateDraftTotals([{ salePrice: 50, cost: 10 }], { type: 'FIXED', value: 80 })).toEqual({ subtotal: 50, discountAmount: 50, total: 0, totalCost: 10, profit: -10, profitMargin: 0 }))
})
