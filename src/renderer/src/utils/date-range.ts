export const toInputDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const toInputMonth = (date: Date): string => toInputDate(date).slice(0, 7)

export const monthRange = (fromMonth: string, toMonth: string): { from: string; to: string } => {
  const [yearPart = '0', monthPart = '0'] = toMonth.split('-')
  const toYear = Number(yearPart)
  const toMonthNumber = Number(monthPart)
  const lastDay = new Date(toYear, toMonthNumber, 0).getDate()
  return { from: `${fromMonth}-01`, to: `${toMonth}-${String(lastDay).padStart(2, '0')}` }
}

export const currentMonthRange = (): { from: string; to: string } => {
  const today = new Date()
  return { from: `${toInputMonth(today)}-01`, to: toInputDate(today) }
}

export const lastDaysRange = (days: number, reference = new Date()): { from: string; to: string } => {
  const safeDays = Math.max(1, Math.floor(days))
  const from = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() - safeDays + 1)
  return { from: toInputDate(from), to: toInputDate(reference) }
}
