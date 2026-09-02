import Decimal from 'decimal.js'

export interface WorkPayInput { regularHours: number; overtimeHours: number; hourlyRate: number; overtimePercentage: number }
export interface WorkPayResult { regularPay: number; overtimePay: number; totalPay: number }

export function calculateWorkPay(input: WorkPayInput): WorkPayResult {
  const regularHours = new Decimal(Math.max(0, input.regularHours))
  const overtimeHours = new Decimal(Math.max(0, input.overtimeHours))
  const hourlyRate = new Decimal(Math.max(0, input.hourlyRate))
  const overtimeMultiplier = new Decimal(1).plus(new Decimal(Math.max(0, input.overtimePercentage)).dividedBy(100))
  const regularPay = regularHours.times(hourlyRate).toDecimalPlaces(2)
  const overtimePay = overtimeHours.times(hourlyRate).times(overtimeMultiplier).toDecimalPlaces(2)
  return { regularPay: regularPay.toNumber(), overtimePay: overtimePay.toNumber(), totalPay: regularPay.plus(overtimePay).toDecimalPlaces(2).toNumber() }
}
