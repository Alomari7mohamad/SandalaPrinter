export function calculateProfitMargin(revenue: number, cost: number): number {
  if (revenue <= 0) return 0
  return ((revenue - cost) / revenue) * 100
}
