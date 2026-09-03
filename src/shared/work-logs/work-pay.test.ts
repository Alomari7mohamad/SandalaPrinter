import { describe, expect, it } from 'vitest'
import { calculateWorkPay } from './work-pay'

describe('calculateWorkPay', () => {
  it('يطبق نسبة الإضافة فقط على الساعات المحددة بزيادة', () => {
    expect(calculateWorkPay({ regularHours: 6, increasedHours: 2, hourlyRate: 20, additionPercentage: 50 }))
      .toEqual({ regularPay: 120, increasedPay: 60, additionPerHour: 10, adjustedHourlyRate: 30, additionPay: 20, totalPay: 180 })
  })
  it('يعامل ساعات الزيادة كأجر عادي عندما تكون النسبة صفراً', () => {
    expect(calculateWorkPay({ regularHours: 5, increasedHours: 2, hourlyRate: 19, additionPercentage: 0 }))
      .toEqual({ regularPay: 95, increasedPay: 38, additionPerHour: 0, adjustedHourlyRate: 19, additionPay: 0, totalPay: 133 })
  })
})
