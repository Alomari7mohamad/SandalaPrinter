export const ARABIC_WITH_LATIN_DIGITS = 'ar-IL-u-nu-latn'
export const LATIN_NUMBER_LOCALE = 'en-US'

export function formatNumber(value: number, minimumFractionDigits = 0, maximumFractionDigits = 2): string {
  const safeMinimum = Math.min(20, Math.max(0, Math.trunc(minimumFractionDigits)))
  const safeMaximum = Math.min(20, Math.max(safeMinimum, Math.trunc(maximumFractionDigits)))
  return new Intl.NumberFormat(LATIN_NUMBER_LOCALE, { minimumFractionDigits: safeMinimum, maximumFractionDigits: safeMaximum }).format(value)
}

export function formatCurrency(value: number, maximumFractionDigits = 2): string {
  const safeMaximum = Math.min(20, Math.max(0, Math.trunc(maximumFractionDigits)))
  return `${formatNumber(value, Math.min(2, safeMaximum), safeMaximum)} ₪`
}

// New orders have integral payable totals. Preserve decimal amounts on older
// orders rather than visually changing an amount that was already saved/paid.
export function formatOrderTotal(value: number): string {
  return formatCurrency(value, Number.isInteger(value) ? 0 : 4)
}
