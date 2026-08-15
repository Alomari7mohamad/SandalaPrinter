export const ARABIC_WITH_LATIN_DIGITS = 'ar-IL-u-nu-latn'
export const LATIN_NUMBER_LOCALE = 'en-US'

export function formatNumber(value: number, minimumFractionDigits = 0, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat(LATIN_NUMBER_LOCALE, { minimumFractionDigits, maximumFractionDigits }).format(value)
}

export function formatCurrency(value: number, maximumFractionDigits = 2): string {
  return `${formatNumber(value, 2, maximumFractionDigits)} ₪`
}
