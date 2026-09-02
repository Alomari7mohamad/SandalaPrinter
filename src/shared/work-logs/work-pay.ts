import Decimal from 'decimal.js'

export interface WorkPayInput { hours: number; hourlyRate: number; additionPercentage: number }
export interface WorkPayResult { basePay: number; additionPerHour: number; adjustedHourlyRate: number; additionPay: number; totalPay: number }

export function calculateWorkPay(input: WorkPayInput): WorkPayResult {
  const hours = new Decimal(Math.max(0, input.hours))
  const hourlyRate = new Decimal(Math.max(0, input.hourlyRate))
  const additionPercentage = new Decimal(Math.max(0, input.additionPercentage))
  const additionPerHour = hourlyRate.times(additionPercentage).dividedBy(100).toDecimalPlaces(2)
  const adjustedHourlyRate = hourlyRate.plus(additionPerHour).toDecimalPlaces(2)
  const basePay = hours.times(hourlyRate).toDecimalPlaces(2)
  const additionPay = hours.times(additionPerHour).toDecimalPlaces(2)
  return {
    basePay: basePay.toNumber(),
    additionPerHour: additionPerHour.toNumber(),
    adjustedHourlyRate: adjustedHourlyRate.toNumber(),
    additionPay: additionPay.toNumber(),
    totalPay: basePay.plus(additionPay).toDecimalPlaces(2).toNumber()
  }
}
