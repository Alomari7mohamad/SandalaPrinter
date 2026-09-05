import { describe, expect, it } from 'vitest'
import { ARABIC_WITH_LATIN_DIGITS, formatCurrency, formatNumber } from './format'

describe('تنسيق الأرقام اللاتينية', () => {
  it('يعرض 12345 بالأرقام الإنجليزية', () => {
    expect(formatNumber(12345)).toBe('12,345')
    expect(formatNumber(12345)).not.toMatch(/[٠-٩]/)
  })

  it('يعرض العملة بكسور لاتينية واضحة', () => {
    expect(formatCurrency(25.25)).toBe('25.25 ₪')
    expect(formatCurrency(25.25, 0)).toBe('25 ₪')
    expect(formatCurrency(25.2, 4)).toBe('25.20 ₪')
  })

  it('لا يسمح بتعارض الحد الأدنى والأقصى للكسور', () => {
    expect(() => formatNumber(12.5, 4, 2)).not.toThrow()
    expect(formatNumber(12.5, 4, 2)).toBe('12.5000')
  })

  it('يبقي التاريخ عربيًا مع أرقام لاتينية', () => {
    const date = new Intl.DateTimeFormat(ARABIC_WITH_LATIN_DIGITS, { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' }).format(new Date('2026-08-10T00:00:00Z'))
    expect(date).not.toMatch(/[٠-٩]/)
    expect(date).toMatch(/[0-9]/)
  })
})
