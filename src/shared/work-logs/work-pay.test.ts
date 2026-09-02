import { describe, expect, it } from 'vitest'
import { calculateWorkPay } from './work-pay'

describe('calculateWorkPay', () => {
  it('يطبق نسبة الإضافة على أجر الساعة لكل ساعات اليوم', () => {
    expect(calculateWorkPay({ hours: 8, hourlyRate: 20, additionPercentage: 50 }))
      .toEqual({ basePay: 160, additionPerHour: 10, adjustedHourlyRate: 30, additionPay: 80, totalPay: 240 })
  })
  it('يعيد الأجر الأساسي نفسه عندما تكون نسبة الإضافة صفراً', () => {
    expect(calculateWorkPay({ hours: 7, hourlyRate: 19, additionPercentage: 0 }))
      .toEqual({ basePay: 133, additionPerHour: 0, adjustedHourlyRate: 19, additionPay: 0, totalPay: 133 })
  })
})
