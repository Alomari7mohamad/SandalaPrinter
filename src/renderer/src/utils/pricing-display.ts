import type { PriceRule } from '../../../shared/pricing/pricing-types'

const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4, useGrouping: false })
const range = (values: number[]) => {
  const unique = [...new Set(values)].sort((left, right) => left - right)
  if (unique.length === 0) return null
  return unique.length === 1 ? number.format(unique[0]!) : `${number.format(unique[0]!)}–${number.format(unique.at(-1)!)} `
}

export function pricingSummary(rules: PriceRule[], unit: string): string {
  const active = rules.filter((rule) => rule.active)
  const fixed = range(active.flatMap((rule) => rule.fixedPrice === null ? [] : [rule.fixedPrice]))
  const perUnit = range(active.flatMap((rule) => rule.unitPrice === null ? [] : [rule.unitPrice]))
  const parts: string[] = []
  if (fixed) parts.push(`${fixed.trim()} ₪`)
  if (perUnit) parts.push(`${perUnit.trim()} ₪ / ${unit}`)
  return parts.join(' • ') || 'غير محدد'
}

export function editableUnitPriceRule(rules: PriceRule[]): PriceRule | undefined {
  const active = rules.filter((rule) => rule.active)
  if (active.length !== 1) return undefined
  const rule = active[0]!
  return rule.ruleType === 'UNIT_PRICE' && rule.unitPrice !== null && (rule.minQuantity === null || rule.minQuantity === 1) && rule.maxQuantity === null ? rule : undefined
}
