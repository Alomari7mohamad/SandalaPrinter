import { describe, expect, it } from 'vitest'
import { calculateDraftTotals } from './order-draft'

describe('calculateDraftTotals', () => {
  it('يجمع عدة خدمات بدقة ويحسب هامش الربح', () => {
    expect(calculateDraftTotals([{ salePrice: 4, cost: 0.75 }, { salePrice: 30, cost: 8 }])).toEqual({ subtotal: 34, discountAmount: 0, totalBeforeRounding: 34, roundingDiscount: 0, total: 34, totalCost: 8.75, profit: 25.25, profitMargin: 74.2647 })
  })
  it('يتعامل مع الطلب الفارغ بأمان', () => expect(calculateDraftTotals([])).toMatchObject({ subtotal: 0, discountAmount: 0, roundingDiscount: 0, total: 0, totalCost: 0, profit: 0, profitMargin: 0 }))
  it('يحسب خصم النسبة ويؤثر في الربح', () => expect(calculateDraftTotals([{ salePrice: 100, cost: 40 }], { type: 'PERCENT', value: 20 })).toMatchObject({ subtotal: 100, discountAmount: 20, roundingDiscount: 0, total: 80, totalCost: 40, profit: 40, profitMargin: 50 }))
  it('يقيد الخصم الثابت بعدد صحيح لا يتجاوز 10% من الطلب', () => expect(calculateDraftTotals([{ salePrice: 58, cost: 10 }], { type: 'FIXED', value: 80.9 })).toMatchObject({ subtotal: 58, discountAmount: 5, roundingDiscount: 0, total: 53, totalCost: 10, profit: 43, profitMargin: 81.1321 }))
  it.each([[50.8,50,0.8],[50.99,50,0.99],[50.9999,50,0.9999],[51,51,0],[0.5,0,0.5]])('يحذف الكسور من %s لصالح الزبون فقط', (amount,total,roundingDiscount) => {
    expect(calculateDraftTotals([{salePrice:amount,cost:0}])).toMatchObject({subtotal:amount,totalBeforeRounding:amount,total,roundingDiscount,profit:total})
  })
  it('يخصم الكسور بعد خصم النسبة وليس قبله', () => {
    expect(calculateDraftTotals([{salePrice:63.5,cost:20}],{type:'PERCENT',value:20})).toMatchObject({subtotal:63.5,discountAmount:12.7,totalBeforeRounding:50.8,roundingDiscount:0.8,total:50,profit:30})
  })
  it('يخصم الكسور بعد خصم الشواقل', () => {
    expect(calculateDraftTotals([{salePrice:52.99,cost:20}],{type:'FIXED',value:2})).toMatchObject({discountAmount:2,totalBeforeRounding:50.99,roundingDiscount:0.99,total:50})
  })
  it('لا يخترع خصمًا إضافيًا للطلب المجاني ويحسب الكسور بدقة عشرية', () => {
    expect(calculateDraftTotals([{salePrice:50.99,cost:10}],{type:'PERCENT',value:100})).toMatchObject({roundingDiscount:0,total:0,profit:-10,profitMargin:0})
    expect(calculateDraftTotals([{salePrice:0.1,cost:0},{salePrice:0.2,cost:0}])).toMatchObject({subtotal:0.3,roundingDiscount:0.3,total:0})
  })
})
