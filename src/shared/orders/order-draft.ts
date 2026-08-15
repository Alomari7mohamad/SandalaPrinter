import Decimal from 'decimal.js'

export interface DraftFinancialItem { salePrice: number; cost: number }
export interface DraftTotals { total: number; totalCost: number; profit: number; profitMargin: number }

export function calculateDraftTotals(items: DraftFinancialItem[]): DraftTotals {
  const total = items.reduce((sum, item) => sum.plus(item.salePrice), new Decimal(0))
  const totalCost = items.reduce((sum, item) => sum.plus(item.cost), new Decimal(0))
  const profit = total.minus(totalCost)
  const profitMargin = total.isZero() ? new Decimal(0) : profit.dividedBy(total).times(100)
  return { total: total.toNumber(), totalCost: totalCost.toNumber(), profit: profit.toNumber(), profitMargin: profitMargin.toDecimalPlaces(4).toNumber() }
}
