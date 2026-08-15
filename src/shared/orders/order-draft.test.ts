import { describe, expect, it } from 'vitest'
import { calculateDraftTotals } from './order-draft'

describe('calculateDraftTotals', () => {
  it('يجمع عدة خدمات بدقة ويحسب هامش الربح', () => {
    expect(calculateDraftTotals([{ salePrice: 4, cost: 0.75 }, { salePrice: 30, cost: 8 }])).toEqual({ total: 34, totalCost: 8.75, profit: 25.25, profitMargin: 74.2647 })
  })
  it('يتعامل مع الطلب الفارغ بأمان', () => expect(calculateDraftTotals([])).toEqual({ total: 0, totalCost: 0, profit: 0, profitMargin: 0 }))
})
