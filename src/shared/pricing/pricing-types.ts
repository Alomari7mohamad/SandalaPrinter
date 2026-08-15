export const pricingRuleTypes = ['EXACT_QUANTITY', 'MIN_QUANTITY', 'QUANTITY_TIER', 'UNIT_PRICE', 'BULK_PRICE', 'FIXED_PRICE'] as const
export type PricingRuleType = typeof pricingRuleTypes[number]

export const costTypes = ['PER_UNIT', 'FIXED_PER_ITEM', 'PER_100', 'QUANTITY_RULE'] as const
export type CostType = typeof costTypes[number]

export interface PriceableService {
  id: string
  code: string
  nameAr: string
  categoryId?: string | null
  active: boolean
  costType: CostType
  unitCost: number | null
  costBatchSize: number | null
}

export const FIXED_QUANTITY_CATEGORY_IDS = ['cat-business-cards', 'cat-note-cards'] as const

export function usesFixedQuantities(service: Pick<PriceableService, 'categoryId'>): boolean {
  return FIXED_QUANTITY_CATEGORY_IDS.includes(service.categoryId as typeof FIXED_QUANTITY_CATEGORY_IDS[number])
}

export interface PriceRule {
  id: string
  serviceId: string
  ruleType: PricingRuleType
  exactQuantity: number | null
  minQuantity: number | null
  maxQuantity: number | null
  fixedPrice: number | null
  unitPrice: number | null
  priority: number
  active: boolean
}

export interface PricingResult {
  quantity: number
  salePrice: number | null
  unitSalePrice: number | null
  cost: number | null
  profit: number | null
  profitMargin: number | null
  matchedRule: PriceRule | null
  requiresManualPricing: boolean
  warnings: string[]
}
