import { describe, expect, it } from 'vitest'
import { catalogBranches } from './catalog-hierarchy'
import type { ServiceCategoryDto, ServiceDto } from './contracts'
import { calculatePrice } from './pricing/pricing-engine'
import type { PriceRule } from './pricing/pricing-types'

describe('catalog filtering and offer pricing', () => {
  it('يفصل المنتجات والخدمات في كل مستويات الاختيار', () => {
    const categories = [
      {id:'products',nameAr:'هدايا',itemType:'PRODUCT'},
      {id:'frames',nameAr:'براويز',itemType:'PRODUCT',parentId:'products'},
      {id:'printing',nameAr:'طباعة',itemType:'SERVICE'}
    ] as ServiceCategoryDto[]
    const items = [
      {id:'frame',nameAr:'برواز',itemType:'PRODUCT',categoryId:'frames'},
      {id:'print',nameAr:'طباعة',itemType:'SERVICE',categoryId:'printing'},
      {id:'orphan',nameAr:'منتج عام',itemType:'PRODUCT',categoryId:null}
    ] as ServiceDto[]
    const productBranches = catalogBranches(categories,items,'PRODUCT')
    expect(productBranches[0]).toMatchObject({id:'products',children:[{id:'frames',items:[{id:'frame'}]}]})
    expect(productBranches[1]).toMatchObject({id:'uncategorized',children:[{items:[{id:'orphan'}]}]})
    expect(catalogBranches(categories,items,'SERVICE')).toMatchObject([{id:'printing',children:[{items:[{id:'print'}]}]}])
  })

  it.each([[35,105],[0,0],[null,135]])('يعتمد سعر العرض %s وإلا سعر البيع', (offerSalePrice,total) => {
    const item = {id:'gift',code:'GIFT',nameAr:'هدية',active:true,costType:'PER_UNIT' as const,unitCost:10,costBatchSize:null,itemType:'PRODUCT' as const,regularSalePrice:45,offerSalePrice}
    const rules: PriceRule[] = [{id:'initial',serviceId:'gift',ruleType:'UNIT_PRICE',minQuantity:1,maxQuantity:null,exactQuantity:null,fixedPrice:null,unitPrice:offerSalePrice ?? 45,priority:10,active:true}]
    expect(calculatePrice(item,rules,3)).toMatchObject({salePrice:total,cost:30,requiresManualPricing:false})
    expect(calculatePrice(item,[],3).requiresManualPricing).toBe(true)
  })
})
