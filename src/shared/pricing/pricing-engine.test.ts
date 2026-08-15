import { describe, expect, it } from 'vitest'
import { corePricingRules, coreServices } from '../../main/database/seed-data'
import { calculatePrice } from './pricing-engine'
import type { PriceableService, PriceRule } from './pricing-types'

const service = (id: string): PriceableService => {
  const found = coreServices.find((item) => item.id === id)
  if (!found) throw new Error(`Missing test service ${id}`)
  return found
}
const rules = (id: string): PriceRule[] => corePricingRules.filter((rule) => rule.serviceId === id)
const price = (id: string, quantity: number) => calculatePrice(service(id), rules(id), quantity)

describe('بيانات الأسعار الأساسية', () => {
  it('تحتوي 33 خدمة و84 قاعدة سعر دون أسعار للمغلفات والمنتجات الجديدة', () => {
    expect(coreServices).toHaveLength(33)
    expect(corePricingRules).toHaveLength(84)
    expect(rules('envelope-printing')).toHaveLength(0)
    expect(rules('product-black-binder')).toHaveLength(0)
    expect(rules('product-nylon-bag')).toHaveLength(0)
  })

  const paperCases: Array<[string, number, number, number, number, number]> = [
    ['paper-a4-bw', 4, 17, 30, 0.25, 0.075], ['paper-a4-color', 7, 30, 55, 0.40, 0.16],
    ['paper-a3-bw', 9, 40, 70, 0.60, 0.18], ['paper-a3-color', 11, 50, 90, 0.80, 0.32],
    ['bristol-a4-bw', 9, 40, 70, 0.60, 0.18], ['bristol-a4-color', 10, 45, 80, 0.70, 0.26],
    ['bristol-a3-bw', 12, 55, 90, 0.80, 0.55], ['bristol-a3-color', 14, 65, 110, 0.90, 0.70],
    ['chromo-a4-bw', 10, 45, 85, 0.75, 0.32], ['chromo-a4-color-light', 12, 50, 90, 0.80, 0.40],
    ['chromo-a4-color-heavy', 20, 75, 125, 1.00, 0.80], ['chromo-a3-bw', 13, 55, 100, 0.90, 0.60],
    ['chromo-a3-color-normal', 15, 65, 110, 1.00, 0.75], ['chromo-a3-color-heavy', 25, 100, 150, 1.20, 0.90]
  ]
  it.each(paperCases)('%s يطابق الأسعار المؤكدة والتكلفة لكل ورقة', (id, p10, p50, p100, over100, unitCost) => {
    expect(price(id, 10)).toMatchObject({ salePrice: p10, cost: Number((unitCost * 10).toFixed(4)), requiresManualPricing: false })
    expect(price(id, 50)).toMatchObject({ salePrice: p50, cost: Number((unitCost * 50).toFixed(4)), requiresManualPricing: false })
    expect(price(id, 100)).toMatchObject({ salePrice: p100, cost: Number((unitCost * 100).toFixed(4)), requiresManualPricing: false })
    expect(price(id, 101)).toMatchObject({ salePrice: Number((over100 * 101).toFixed(4)), cost: Number((unitCost * 101).toFixed(4)), requiresManualPricing: false })
    expect(price(id, 200)).toMatchObject({ salePrice: Number((over100 * 200).toFixed(4)), cost: Number((unitCost * 200).toFixed(4)), requiresManualPricing: false })
    expect(price(id, 75)).toMatchObject({ salePrice: Number(((p100 / 100) * 75).toFixed(4)), requiresManualPricing: false })
  })
})

describe('A4 أبيض وأسود', () => {
  it.each([[10, 4, 0.75], [50, 17, 3.75], [100, 30, 7.5], [101, 25.25, 7.575], [200, 50, 15]])('الكمية %i', (quantity, salePrice, cost) => {
    expect(price('paper-a4-bw', quantity)).toMatchObject({ salePrice, cost, requiresManualPricing: false })
  })
  it('يحسب هامش الربح الحقيقي', () => expect(price('paper-a4-bw', 100).profitMargin).toBe(75))
  it.each([[1, 0.4], [9, 3.6], [11, 3.74], [49, 16.66], [51, 15.3], [75, 22.5]])('يحسب أي كمية %i بسعر الوحدة الخاص بالشريحة', (quantity, salePrice) => {
    expect(price('paper-a4-bw', quantity)).toMatchObject({ salePrice, requiresManualPricing: false })
  })
})

describe('A4 ملون', () => {
  it.each([[10, 7], [50, 30], [100, 55], [101, 40.4], [200, 80]])('الكمية %i سعرها %s', (quantity, salePrice) => {
    expect(price('paper-a4-color', quantity).salePrice).toBe(salePrice)
  })
})

describe('المنتجات ذات تكلفة الدفعات', () => {
  it.each([
    ['business-card-single', 100, 40, 6], ['business-card-single', 200, 60, 12], ['business-card-single', 500, 80, 30], ['business-card-single', 1000, 130, 60],
    ['business-card-double', 100, 50, 8.5], ['business-card-double', 200, 80, 17], ['business-card-double', 500, 140, 42.5], ['business-card-double', 1000, 190, 85],
    ['note-cards-9x9', 100, 10, 3.5], ['note-cards-9x9', 200, 17, 7], ['note-cards-9x9', 500, 35, 17.5], ['note-cards-9x9', 1000, 60, 35]
  ])('%s × %i', (id, quantity, salePrice, cost) => expect(price(id as string, quantity as number)).toMatchObject({ salePrice, cost, requiresManualPricing: false }))
  it.each([['business-card-single', 150], ['business-card-double', 300], ['note-cards-9x9', 50]])('لا يخترع سعرًا لـ %s كمية %i', (id, quantity) => expect(price(id, quantity).requiresManualPricing).toBe(true))
})

describe('دفاتر A4 وA5', () => {
  const cases: Array<[string, number, number, number]> = [
    ['notebook-a4-50-bw', 5, 15, 12], ['notebook-a4-50-color', 6, 18, 15], ['notebook-a4-100-bw', 8, 25, 20], ['notebook-a4-100-color', 10, 30, 25],
    ['notebook-a5-50-bw', 4, 12, 10], ['notebook-a5-50-color', 5, 15, 12], ['notebook-a5-100-bw', 6, 15, 12], ['notebook-a5-100-color', 7, 18, 15]
  ]
  it.each(cases)('%s يطبق السعر العادي والجملة', (id, unitCost, regular, bulk) => {
    expect(price(id, 1)).toMatchObject({ salePrice: regular, cost: unitCost })
    expect(price(id, 4)).toMatchObject({ salePrice: regular * 4, cost: unitCost * 4 })
    expect(price(id, 5)).toMatchObject({ salePrice: bulk * 5, cost: unitCost * 5 })
    expect(price(id, 10)).toMatchObject({ salePrice: bulk * 10, cost: unitCost * 10 })
  })
})

describe('حالات الحماية', () => {
  it.each([0, -1, Number.NaN])('يرفض الكمية غير الصالحة %s', (quantity) => {
    const result = price('paper-a4-bw', quantity)
    expect(result.requiresManualPricing).toBe(true)
    expect(result.salePrice).toBeNull()
  })
  it('يرفض الخدمة المعطلة', () => {
    const result = calculatePrice({ ...service('paper-a4-bw'), active: false }, rules('paper-a4-bw'), 10)
    expect(result.requiresManualPricing).toBe(true)
    expect(result.warnings.join(' ')).toContain('غير نشطة')
  })
  it('يتجاهل قاعدة السعر المعطلة', () => {
    const disabled = rules('paper-a4-bw').map((rule) => rule.exactQuantity === 10 ? { ...rule, active: false } : rule)
    const result = calculatePrice(service('paper-a4-bw'), disabled, 10)
    expect(result).toMatchObject({ salePrice: 3.4, requiresManualPricing: false })
    expect(result.matchedRule?.exactQuantity).toBe(50)
  })
  it('يكشف القواعد المتعارضة ولا يختار سعرًا عشوائيًا', () => {
    const original = rules('paper-a4-bw').find((rule) => rule.exactQuantity === 10)!
    const conflict: PriceRule = { ...original, id: 'conflict', fixedPrice: 99 }
    const result = calculatePrice(service('paper-a4-bw'), [original, conflict], 10)
    expect(result.requiresManualPricing).toBe(true)
    expect(result.warnings.join(' ')).toContain('متعارضة')
  })
  it('يتعامل مع قواعد مفقودة والمغلفات دون NaN', () => {
    const result = price('envelope-printing', 10)
    expect(result).toMatchObject({ salePrice: null, cost: null, profit: null, profitMargin: null, requiresManualPricing: true })
    expect(result.warnings.join(' ')).toContain('يلزم إدخال السعر يدويًا')
  })
  it('يسمح ببيع خدمة لها سعر صالح حتى إذا لم تُسجل تكلفتها بعد', () => {
    const serviceWithoutCost: PriceableService = { id: 'priced-no-cost', code: 'NO_COST', nameAr: 'خدمة بلا تكلفة', active: true, costType: 'PER_UNIT', unitCost: null, costBatchSize: null }
    const saleRule: PriceRule = { id: 'priced-no-cost-rule', serviceId: serviceWithoutCost.id, ruleType: 'UNIT_PRICE', exactQuantity: null, minQuantity: 1, maxQuantity: null, fixedPrice: null, unitPrice: 10, priority: 1, active: true }
    const result = calculatePrice(serviceWithoutCost, [saleRule], 4)
    expect(result).toMatchObject({ salePrice: 40, cost: 0, profit: 40, profitMargin: 100, requiresManualPricing: false })
    expect(result.warnings.join(' ')).toContain('تكلفة الخدمة غير محددة')
  })
  it('يعالج سعر البيع صفر بأمان', () => {
    const zeroRule: PriceRule = { id: 'zero', serviceId: 'paper-a4-bw', ruleType: 'EXACT_QUANTITY', exactQuantity: 1, minQuantity: null, maxQuantity: null, fixedPrice: 0, unitPrice: null, priority: 1, active: true }
    const result = calculatePrice(service('paper-a4-bw'), [zeroRule], 1)
    expect(result.profitMargin).toBe(0)
    expect(Number.isFinite(result.profitMargin!)).toBe(true)
  })
  it('يستخدم Decimal ولا يُظهر أثر 0.1 + 0.2', () => {
    const decimalService: PriceableService = { id: 'decimal', code: 'DECIMAL', nameAr: 'اختبار', active: true, costType: 'PER_UNIT', unitCost: 0.1, costBatchSize: null }
    const decimalRule: PriceRule = { id: 'decimal-rule', serviceId: 'decimal', ruleType: 'UNIT_PRICE', exactQuantity: null, minQuantity: 1, maxQuantity: null, fixedPrice: null, unitPrice: 0.3, priority: 1, active: true }
    expect(calculatePrice(decimalService, [decimalRule], 3)).toMatchObject({ salePrice: 0.9, cost: 0.3, profit: 0.6 })
  })
  it('يطبق شرائح من-إلى بسعر وحدة مختلف لكل نطاق', () => {
    const tierService: PriceableService = { id: 'tier-service', code: 'TIER', nameAr: 'شرائح', active: true, costType: 'PER_UNIT', unitCost: 0.1, costBatchSize: null }
    const tierRules: PriceRule[] = [
      { id: 'tier-1', serviceId: tierService.id, ruleType: 'UNIT_PRICE', exactQuantity: null, minQuantity: 1, maxQuantity: 10, fixedPrice: null, unitPrice: 0.4, priority: 10, active: true },
      { id: 'tier-2', serviceId: tierService.id, ruleType: 'UNIT_PRICE', exactQuantity: null, minQuantity: 11, maxQuantity: 20, fixedPrice: null, unitPrice: 0.3, priority: 10, active: true }
    ]
    expect(calculatePrice(tierService, tierRules, 7).salePrice).toBe(2.8)
    expect(calculatePrice(tierService, tierRules, 15).salePrice).toBe(4.5)
  })
  it('يطبق شريحة رقم فأكثر ابتداءً من الحد المحدد', () => {
    const openService: PriceableService = { id: 'open-service', code: 'OPEN', nameAr: 'شريحة مفتوحة', active: true, costType: 'PER_UNIT', unitCost: 0.1, costBatchSize: null }
    const openRule: PriceRule = { id: 'open-rule', serviceId: openService.id, ruleType: 'MIN_QUANTITY', exactQuantity: null, minQuantity: 100, maxQuantity: null, fixedPrice: null, unitPrice: 0.2, priority: 10, active: true }
    expect(calculatePrice(openService, [openRule], 99).requiresManualPricing).toBe(true)
    expect(calculatePrice(openService, [openRule], 100).salePrice).toBe(20)
    expect(calculatePrice(openService, [openRule], 150).salePrice).toBe(30)
  })
})
