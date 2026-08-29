import { describe, expect, it } from 'vitest'
import { createBookletPlan } from './booklet-imposition'

describe('booklet imposition', () => {
  it('matches the supplied eight-page example', () => {
    const plan = createBookletPlan(8)
    expect(plan.sheetCount).toBe(2)
    expect(plan.signatures[0]!.sheets).toEqual([
      { sheetNumber: 1, signatureNumber: 1, sheetInSignature: 1, outside: { left: 1, right: 8 }, inside: { left: 7, right: 2 } },
      { sheetNumber: 2, signatureNumber: 1, sheetInSignature: 2, outside: { left: 3, right: 6 }, inside: { left: 5, right: 4 } }
    ])
  })
  it('creates practical signatures for a 100-page book', () => {
    const plan = createBookletPlan(100, 16)
    expect(plan.sheetCount).toBe(25)
    expect(plan.signatures).toHaveLength(7)
    expect(plan.signatures[0]!.sheets[0]!.outside).toEqual({ left: 1, right: 16 })
    expect(plan.signatures[6]!.sheets[0]).toMatchObject({ outside: { left: 97, right: 100 }, inside: { left: 99, right: 98 } })
  })
  it('adds blank slots when the page count is not divisible by four', () => {
    const plan = createBookletPlan(10)
    expect(plan.paddedPageCount).toBe(12)
    expect(plan.blankPageCount).toBe(2)
    expect(plan.signatures[0]!.sheets[0]).toMatchObject({ outside: { left: 1, right: null }, inside: { left: null, right: 2 } })
  })
  it('can put page one on the inside and mirror the binding direction', () => {
    expect(createBookletPlan(8, null, 'INSIDE').signatures[0]!.sheets[0]).toMatchObject({ outside: { left: 7, right: 2 }, inside: { left: 1, right: 8 } })
    expect(createBookletPlan(8, null, 'OUTSIDE', 'PAGE_ONE_RIGHT').signatures[0]!.sheets[0]!.outside).toEqual({ left: 8, right: 1 })
  })
})
