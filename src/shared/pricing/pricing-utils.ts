import Decimal from 'decimal.js'
import type { PriceRule } from './pricing-types'

export const money = (value: Decimal.Value): number => new Decimal(value).toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toNumber()

export function ruleMatches(rule: PriceRule, quantity: number): boolean {
  if (!rule.active) return false
  if (rule.exactQuantity !== null && quantity !== rule.exactQuantity) return false
  if (rule.minQuantity !== null && quantity < rule.minQuantity) return false
  if (rule.maxQuantity !== null && quantity > rule.maxQuantity) return false

  if (rule.ruleType === 'EXACT_QUANTITY' || rule.ruleType === 'BULK_PRICE') {
    return rule.exactQuantity !== null && quantity === rule.exactQuantity
  }
  if (rule.ruleType === 'MIN_QUANTITY') return rule.minQuantity !== null && quantity >= rule.minQuantity
  if (rule.ruleType === 'QUANTITY_TIER') return rule.minQuantity !== null || rule.maxQuantity !== null
  if (rule.ruleType === 'UNIT_PRICE') return rule.unitPrice !== null
  return rule.ruleType === 'FIXED_PRICE'
}

export function ruleSpecificity(rule: PriceRule): number {
  if (rule.ruleType === 'EXACT_QUANTITY' || rule.ruleType === 'BULK_PRICE') return 60
  if (rule.ruleType === 'QUANTITY_TIER') return 50
  if (rule.ruleType === 'MIN_QUANTITY') return 40
  if (rule.ruleType === 'UNIT_PRICE') return 30
  return 10
}

export function rangesOverlap(left: PriceRule, right: PriceRule): boolean {
  if (!left.active || !right.active) return false
  const leftMin = left.exactQuantity ?? left.minQuantity ?? Number.NEGATIVE_INFINITY
  const leftMax = left.exactQuantity ?? left.maxQuantity ?? Number.POSITIVE_INFINITY
  const rightMin = right.exactQuantity ?? right.minQuantity ?? Number.NEGATIVE_INFINITY
  const rightMax = right.exactQuantity ?? right.maxQuantity ?? Number.POSITIVE_INFINITY
  return leftMin <= rightMax && rightMin <= leftMax
}
