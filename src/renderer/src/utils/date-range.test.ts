import { describe, expect, it } from 'vitest'
import { lastDaysRange, monthRange, toInputDate } from './date-range'

describe('date range helpers', () => {
  it('ينشئ تاريخًا محليًا بصيغة الإدخال', () => expect(toInputDate(new Date(2026, 7, 9))).toBe('2026-08-09'))
  it('يحسب آخر يوم في الشهر بما فيه السنة الكبيسة', () => {
    expect(monthRange('2026-01', '2026-02')).toEqual({ from: '2026-01-01', to: '2026-02-28' })
    expect(monthRange('2024-02', '2024-02').to).toBe('2024-02-29')
  })
  it('يحسب آخر سبعة أيام حتى عند عبور بداية الشهر', () => {
    expect(lastDaysRange(7, new Date(2026, 7, 3))).toEqual({ from: '2026-07-28', to: '2026-08-03' })
  })
})
