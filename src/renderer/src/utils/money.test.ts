import { describe, expect, it } from 'vitest'
import { calculateProfitMargin } from './money'

describe('calculateProfitMargin', () => {
  it('uses profit divided by revenue rather than markup', () => {
    expect(calculateProfitMargin(100, 60)).toBe(40)
  })
  it('returns zero for missing revenue', () => {
    expect(calculateProfitMargin(0, 10)).toBe(0)
  })
})
