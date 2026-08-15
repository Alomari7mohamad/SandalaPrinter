import { describe, expect, it } from 'vitest'
import type { PriceRule } from '../../../shared/pricing/pricing-types'
import { editableUnitPriceRule, pricingSummary } from './pricing-display'

const rule = (input: Partial<PriceRule> & Pick<PriceRule, 'id'>): PriceRule => ({
  serviceId: 'service', ruleType: 'EXACT_QUANTITY', exactQuantity: null, minQuantity: null, maxQuantity: null,
  fixedPrice: null, unitPrice: null, priority: 10, active: true, ...input
})

describe('عرض أسعار البيع في صفحة الخدمات', () => {
  it('يلخص الأسعار الثابتة وأسعار الوحدة', () => {
    expect(pricingSummary([
      rule({ id: '1', exactQuantity: 10, fixedPrice: 4 }),
      rule({ id: '2', exactQuantity: 100, fixedPrice: 30 }),
      rule({ id: '3', ruleType: 'UNIT_PRICE', minQuantity: 101, unitPrice: 0.25 })
    ], 'ورقة')).toBe('4–30 ₪ • 0.25 ₪ / ورقة')
  })

  it('يتعرف على قاعدة سعر الوحدة البسيطة القابلة للتعديل', () => {
    const simple = rule({ id: 'simple', ruleType: 'UNIT_PRICE', minQuantity: 1, unitPrice: 3 })
    expect(editableUnitPriceRule([simple])?.id).toBe('simple')
    expect(editableUnitPriceRule([simple, rule({ id: 'extra', fixedPrice: 10 })])).toBeUndefined()
  })
})
