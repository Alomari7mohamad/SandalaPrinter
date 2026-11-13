import Decimal from 'decimal.js'
import { money, ruleMatches, ruleSpecificity } from './pricing-utils'
import { usesFixedQuantities, type PriceableService, type PriceRule, type PricingResult } from './pricing-types'

function calculateCost(service: PriceableService, quantity: number, warnings: string[]): number | null {
  if (service.unitCost === null) {
    warnings.push('تكلفة الخدمة غير محددة.')
    return null
  }
  const cost = new Decimal(service.unitCost)
  if (service.costType === 'PER_UNIT' || service.costType === 'FIXED_PER_ITEM') return money(cost.times(quantity))
  if (service.costType === 'PER_100') {
    const batchSize = service.costBatchSize ?? 100
    return money(cost.times(quantity).dividedBy(batchSize))
  }
  warnings.push('تحتاج تكلفة هذه الخدمة إلى قاعدة كمية يدوية.')
  return null
}

export function calculatePrice(service: PriceableService, pricingRules: PriceRule[], quantity: number): PricingResult {
  const warnings: string[] = []
  const base: PricingResult = { quantity, salePrice: null, unitSalePrice: null, cost: null, profit: null, profitMargin: null, matchedRule: null, requiresManualPricing: true, warnings }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    warnings.push('يجب أن تكون الكمية رقمًا أكبر من صفر.')
    return base
  }
  if (!service.active) {
    warnings.push('الخدمة غير نشطة ولا يمكن تسعيرها تلقائيًا.')
    return base
  }

  base.cost = calculateCost(service, quantity, warnings)
  let matches = pricingRules.filter((rule) => rule.serviceId === service.id && ruleMatches(rule, quantity))
    .sort((left, right) => ruleSpecificity(right) - ruleSpecificity(left) || right.priority - left.priority || left.id.localeCompare(right.id))
  let interpolatedExactRule = false
  if (matches.length === 0 && !usesFixedQuantities(service)) {
    const futureExactRules = pricingRules.filter((rule) => rule.serviceId === service.id && rule.active && rule.exactQuantity !== null && rule.exactQuantity >= quantity && rule.fixedPrice !== null)
    const nextQuantity = futureExactRules.reduce<number | null>((current, rule) => current === null || rule.exactQuantity! < current ? rule.exactQuantity : current, null)
    if (nextQuantity !== null) {
      matches = futureExactRules.filter((rule) => rule.exactQuantity === nextQuantity)
        .sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id))
      interpolatedExactRule = nextQuantity !== quantity
    }
  }
  if (matches.length === 0) {
    warnings.push('لا توجد قاعدة سعر محددة لهذه الكمية.', 'يلزم إدخال السعر يدويًا.')
    return base
  }

  const best = matches[0]!
  const bestSpecificity = ruleSpecificity(best)
  const conflicts = matches.filter((rule) => rule.id !== best.id && ruleSpecificity(rule) === bestSpecificity && rule.priority === best.priority)
  if (conflicts.length > 0) {
    warnings.push('توجد قواعد تسعير متعارضة لهذه الكمية. يلزم مراجعتها قبل التسعير.')
    return base
  }

  let sale: Decimal | null = null
  if (interpolatedExactRule && best.fixedPrice !== null && best.exactQuantity !== null) {
    sale = new Decimal(best.fixedPrice).dividedBy(best.exactQuantity).times(quantity)
    warnings.push(`حُسب السعر حسب شريحة الكمية حتى ${best.exactQuantity}.`)
  } else if (best.unitPrice !== null) sale = new Decimal(best.unitPrice).times(quantity)
  else if (best.fixedPrice !== null) sale = new Decimal(best.fixedPrice)
  if (sale === null) {
    warnings.push('قاعدة السعر المطابقة لا تحتوي سعرًا صالحًا.', 'يلزم إدخال السعر يدويًا.')
    return base
  }

  base.salePrice = money(sale)
  base.unitSalePrice = money(sale.dividedBy(quantity))
  base.matchedRule = best
  base.requiresManualPricing = false
  // A missing internal cost must not prevent selling a service that has a valid sale price.
  // Keep the warning emitted by calculateCost, and use zero until the real cost is entered.
  const effectiveCost = base.cost ?? 0
  base.cost = effectiveCost
  const profit = sale.minus(effectiveCost)
  base.profit = money(profit)
  base.profitMargin = sale.isZero() ? 0 : money(profit.dividedBy(sale).times(100))
  if (profit.isNegative()) warnings.push('تحذير: سعر البيع أقل من تكلفة الخدمة.')
  return base
}
