import Decimal from 'decimal.js'

export interface WorkPayInput { regularHours: number; increasedHours: number; hourlyRate: number; additionPercentage: number }
export interface WorkPayResult { regularPay: number; increasedPay: number; additionPerHour: number; adjustedHourlyRate: number; additionPay: number; totalPay: number }

export function calculateWorkPay(input: WorkPayInput): WorkPayResult {
  const regularHours = new Decimal(Math.max(0, input.regularHours))
  const increasedHours = new Decimal(Math.max(0, input.increasedHours))
  const hourlyRate = new Decimal(Math.max(0, input.hourlyRate))
  const additionPercentage = new Decimal(Math.max(0, input.additionPercentage))
  const additionPerHour = hourlyRate.times(additionPercentage).dividedBy(100).toDecimalPlaces(2)
  const adjustedHourlyRate = hourlyRate.plus(additionPerHour).toDecimalPlaces(2)
  const regularPay = regularHours.times(hourlyRate).toDecimalPlaces(2)
  const increasedBasePay = increasedHours.times(hourlyRate).toDecimalPlaces(2)
  const additionPay = increasedHours.times(additionPerHour).toDecimalPlaces(2)
  const increasedPay = increasedBasePay.plus(additionPay).toDecimalPlaces(2)
  return {
    regularPay: regularPay.toNumber(),
    increasedPay: increasedPay.toNumber(),
    additionPerHour: additionPerHour.toNumber(),
    adjustedHourlyRate: adjustedHourlyRate.toNumber(),
    additionPay: additionPay.toNumber(),
    totalPay: regularPay.plus(increasedPay).toDecimalPlaces(2).toNumber()
  }
}
