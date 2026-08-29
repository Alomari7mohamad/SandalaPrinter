import Decimal from 'decimal.js'

export interface DraftFinancialItem { salePrice: number; cost: number }
export type OrderDiscountType = 'NONE' | 'FIXED' | 'PERCENT'
export interface DraftDiscount { type: OrderDiscountType; value: number }
export interface DraftTotals { subtotal: number; discountAmount: number; total: number; totalCost: number; profit: number; profitMargin: number }

export function calculateDraftTotals(items: DraftFinancialItem[], discount: DraftDiscount = { type: 'NONE', value: 0 }): DraftTotals {
  const subtotal = items.reduce((sum, item) => sum.plus(item.salePrice), new Decimal(0))
  const totalCost = items.reduce((sum, item) => sum.plus(item.cost), new Decimal(0))
  const safeValue = new Decimal(Number.isFinite(discount.value) ? Math.max(0, discount.value) : 0)
  const requestedDiscount = discount.type === 'PERCENT'
    ? subtotal.times(Decimal.min(safeValue, 100)).dividedBy(100)
    : discount.type === 'FIXED' ? safeValue : new Decimal(0)
  const discountAmount = Decimal.min(requestedDiscount, subtotal).toDecimalPlaces(4)
  const total = subtotal.minus(discountAmount)
  const profit = total.minus(totalCost)
  const profitMargin = total.isZero() ? new Decimal(0) : profit.dividedBy(total).times(100)
  return { subtotal: subtotal.toNumber(), discountAmount: discountAmount.toNumber(), total: total.toNumber(), totalCost: totalCost.toNumber(), profit: profit.toNumber(), profitMargin: profitMargin.toDecimalPlaces(4).toNumber() }
}
