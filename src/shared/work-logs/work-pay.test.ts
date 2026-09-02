import { describe, expect, it } from 'vitest'
import { calculateWorkPay } from './work-pay'

describe('calculateWorkPay', () => {
  it('يحسب الساعات العادية والإضافية مع نسبة الزيادة', () => {
    expect(calculateWorkPay({ regularHours: 8, overtimeHours: 2, hourlyRate: 20, overtimePercentage: 50 }))
      .toEqual({ regularPay: 160, overtimePay: 60, totalPay: 220 })
  })
  it('يتعامل مع الكسور بدقة مالية', () => {
    expect(calculateWorkPay({ regularHours: 7.5, overtimeHours: 1.25, hourlyRate: 18.75, overtimePercentage: 25 }))
      .toEqual({ regularPay: 140.63, overtimePay: 29.3, totalPay: 169.93 })
  })
})
