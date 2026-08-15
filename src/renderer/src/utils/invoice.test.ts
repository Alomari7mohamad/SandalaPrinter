import { describe, expect, it } from 'vitest'
import { splitTaxInclusive } from './invoice'

describe('تقسيم السعر الشامل للضريبة', () => {
  it('يفصل ضريبة 18% من الإجمالي مع بقاء المجموع مطابقًا', () => {
    const result = splitTaxInclusive(100)
    expect(result).toEqual({ beforeTax: 84.75, tax: 15.25, total: 100 })
    expect(result.beforeTax + result.tax).toBe(result.total)
  })

  it('يتعامل مع الكسور النقدية دون أثر عشري زائد', () => {
    const result = splitTaxInclusive(17.9)
    expect(result.beforeTax + result.tax).toBe(result.total)
  })
})
