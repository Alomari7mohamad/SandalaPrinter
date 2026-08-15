import { describe, expect, it } from 'vitest'
import { calculateInventoryConsumption, type InventoryConsumptionSource } from './inventory-consumption'

const source = (input: Partial<InventoryConsumptionSource> & Pick<InventoryConsumptionSource, 'serviceId' | 'quantity'>): InventoryConsumptionSource => ({
  categoryId: null, size: null, coverage: null, ...input
})

describe('استهلاك المخزون عند تأكيد الطلب', () => {
  it('يخصم الورق والبروستول والخرومو حسب المقاس والكمية', () => {
    expect(calculateInventoryConsumption([
      source({ serviceId: 'paper-a4-bw', categoryId: 'cat-paper', size: 'A4', quantity: 50 }),
      source({ serviceId: 'bristol-a3-color', categoryId: 'cat-bristol', size: 'A3', quantity: 12 }),
      source({ serviceId: 'chromo-a4-bw', categoryId: 'cat-chromo', size: 'A4', quantity: 8 })
    ])).toEqual([
      { inventoryItemId: 'inv-paper-a4', quantity: 50 },
      { inventoryItemId: 'inv-bristol-a3', quantity: 12 },
      { inventoryItemId: 'inv-chromo-a4', quantity: 8 }
    ])
  })

  it('يحسب ورق وكرتون دفاتر A4', () => {
    expect(calculateInventoryConsumption([
      source({ serviceId: 'notebook-a4-50-bw', categoryId: 'cat-notebooks', size: 'A4', coverage: '50 صفحة', quantity: 3 })
    ])).toEqual([
      { inventoryItemId: 'inv-paper-a4', quantity: 150 },
      { inventoryItemId: 'inv-cardboard', quantity: 3 }
    ])
  })

  it('يحوّل كل صفحتين A5 إلى ورقة A4 وكل دفترين إلى كرتون واحد', () => {
    expect(calculateInventoryConsumption([
      source({ serviceId: 'notebook-a5-100-color', categoryId: 'cat-notebooks', size: 'A5', coverage: '100 صفحة', quantity: 3 })
    ])).toEqual([
      { inventoryItemId: 'inv-paper-a4', quantity: 150 },
      { inventoryItemId: 'inv-cardboard', quantity: 1.5 }
    ])
  })

  it('يجمع استهلاك المنتجات المباشرة المتكررة', () => {
    expect(calculateInventoryConsumption([
      source({ serviceId: 'product-nylon-bag', quantity: 4 }),
      source({ serviceId: 'product-bag-folder', quantity: 2 }),
      source({ serviceId: 'product-red-glue', quantity: 1 })
    ])).toEqual([
      { inventoryItemId: 'inv-nylon-bags', quantity: 6 },
      { inventoryItemId: 'inv-red-glue', quantity: 1 }
    ])
  })
})
