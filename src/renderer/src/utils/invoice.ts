import Decimal from 'decimal.js'

export function splitTaxInclusive(total: number, taxRate = 0.18): { beforeTax: number; tax: number; total: number } {
  const finalTotal = new Decimal(total).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
  const beforeTax = finalTotal.dividedBy(new Decimal(1).plus(taxRate)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
  return {
    beforeTax: beforeTax.toNumber(),
    tax: finalTotal.minus(beforeTax).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    total: finalTotal.toNumber()
  }
}
