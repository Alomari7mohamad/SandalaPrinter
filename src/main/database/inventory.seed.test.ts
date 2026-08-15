import { describe, expect, it } from 'vitest'
import { inventoryItems } from './inventory.seed'

describe('تكاليف المخزون الأساسية', () => {
  it('تحتوي تكاليف المواد المؤكدة فقط', () => {
    const costs = Object.fromEntries(inventoryItems.map(([id, , , , purchaseCost]) => [id, purchaseCost]))
    expect(costs).toMatchObject({
      'inv-paper-a4': 0.075,
      'inv-paper-a3': 0.18,
      'inv-bristol-a4': 0.18,
      'inv-bristol-a3': 0.55,
      'inv-chromo-a4': 0.32,
      'inv-chromo-a3': 0.60
    })
    expect(costs['inv-cardboard']).toBe(0)
    expect(costs['inv-red-glue']).toBe(0)
  })
})
