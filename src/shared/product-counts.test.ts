import { describe, expect, it } from 'vitest'
import { productCounts } from './product-counts'

const categories = [
  { id: 'main', itemType: 'PRODUCT' }, { id: 'child', itemType: 'PRODUCT', parentId: 'main' },
  { id: 'empty', itemType: 'PRODUCT', parentId: 'main' }, { id: 'printing', itemType: 'SERVICE' }
] satisfies Parameters<typeof productCounts>[0]
describe('product counts', () => {
  it('counts unique catalog products, including inactive ones, but not services or deleted records', () => {
    const items = [
      { id: 'one', itemType: 'PRODUCT', categoryId: 'child', active: true },
      { id: 'two', itemType: 'PRODUCT', categoryId: 'main', active: false },
      { id: 'three', itemType: 'PRODUCT', categoryId: null },
      { id: 'one', itemType: 'PRODUCT', categoryId: 'child' },
      { id: 'service', itemType: 'SERVICE', categoryId: 'printing' },
      { id: 'deleted', itemType: 'PRODUCT', code: 'ARCHIVED-deleted', categoryId: 'child' }
    ] satisfies Parameters<typeof productCounts>[1]
    expect(productCounts(categories, items)).toEqual({ total: 3, uncategorized: 1, byCategory: { main: 2, child: 1, empty: 0 } })
  })
  it('updates counts when a product moves or is removed, keeping empty categories visible', () => {
    const item = { id: 'one', itemType: 'PRODUCT', categoryId: 'child' } as const
    expect(productCounts(categories, [{ ...item, categoryId: 'empty' }]).byCategory).toEqual({ main: 1, child: 0, empty: 1 })
    expect(productCounts(categories, []).total).toBe(0)
    expect(productCounts(categories, []).byCategory.child).toBe(0)
  })
  it('includes unassigned and unknown-category products in the total without counting services', () => {
    expect(productCounts([], [{ id: 'orphan', itemType: 'PRODUCT', categoryId: 'missing' }])).toEqual({ total: 1, uncategorized: 1, byCategory: {} })
  })
})
