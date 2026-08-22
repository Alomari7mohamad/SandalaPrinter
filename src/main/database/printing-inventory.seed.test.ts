import { describe, expect, it } from 'vitest'
import { printingInventoryDefinitions } from './printing-inventory.seed'

describe('رزم مخزون الطباعة', () => {
  it('تحتوي جميع مواد الورق المطلوبة دون تكرار', () => {
    expect(printingInventoryDefinitions).toHaveLength(16)
    expect(new Set(printingInventoryDefinitions.map((item) => item.id)).size).toBe(16)
    expect(new Set(printingInventoryDefinitions.map((item) => item.sku)).size).toBe(16)
  })

  it('يحفظ إعدادات الرزم والأسعار المحددة كما طلبت', () => {
    const byId = Object.fromEntries(printingInventoryDefinitions.map((item) => [item.id, item]))
    expect(byId['inv-paper-a4']).toMatchObject({ unitsPerPackage: 500, packagePrice: 12 })
    expect(byId['inv-paper-a3']).toMatchObject({ unitsPerPackage: 500, packagePrice: 30 })
    expect(byId['inv-bristol-a4']).toMatchObject({ unitsPerPackage: 70, packagePrice: 60 })
    expect(byId['inv-bristol-color-a4']).toMatchObject({ unitsPerPackage: 1000, packagePrice: 70 })
    expect(byId['inv-sticker-white-a3']).toMatchObject({ unitsPerPackage: 200, packagePrice: 700 })
    expect(byId['inv-sublimation-german']).toMatchObject({ unitsPerPackage: 200, packagePrice: 140 })
    expect(byId['inv-sublimation-chinese']).toMatchObject({ unitsPerPackage: 100, packagePrice: 50 })
  })

  it('يبقي المواد التي لم يحدد سعرها دون إعداد رزمة مفترض', () => {
    expect(printingInventoryDefinitions.find((item) => item.id === 'inv-duplex-cardboard-400')).toMatchObject({ unitsPerPackage: null, packagePrice: null })
    expect(printingInventoryDefinitions.find((item) => item.id === 'inv-ncr-invoice-a4')).toMatchObject({ unitsPerPackage: null, packagePrice: null })
  })
})
