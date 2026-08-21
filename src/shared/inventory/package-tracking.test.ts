import { describe, expect, it } from 'vitest'
import { packageReorderPoint, splitPackageStock } from './package-tracking'

describe('متابعة المخزون بالرزم', () => {
  it('يحسب الرزم الكاملة والورق المتبقي بعد الاستهلاك', () => {
    expect(splitPackageStock(2000 - 40, 500)).toEqual({ fullPackages: 3, looseUnits: 460 })
  })

  it('ينبه عند النزول تحت عدد الرزم المحدد', () => {
    expect(packageReorderPoint(1, 500)).toBe(499)
    expect(packageReorderPoint(2, 500)).toBe(999)
  })
})
