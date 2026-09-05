import { z } from 'zod'
import { costTypes, pricingRuleTypes, type PriceRule, type PricingResult } from '../../shared/pricing/pricing-types'
import { calculatePrice } from '../../shared/pricing/pricing-engine'
import { rangesOverlap, ruleSpecificity } from '../../shared/pricing/pricing-utils'
import type { PricingRuleInput, ServiceCategoryInput, ServiceInput } from '../../shared/contracts'
import * as repository from '../database/catalog.repository'

const nullableText = z.string().trim().max(250).nullable()
const categorySchema = z.object({ id: z.string().min(2).max(100).optional(), nameAr: z.string().trim().min(2, 'اسم التصنيف قصير جدًا.').max(100) })
const serviceSchema = z.object({
  id: z.string().uuid().or(z.string().min(2)).optional(), code: z.string().trim().min(2).max(80).regex(/^[A-Z0-9_-]+$/),
  nameAr: z.string().trim().min(2).max(150), nameHe: z.string().trim().max(150).nullable(), categoryId: z.string().min(2), paperType: nullableText, size: nullableText,
  colorMode: nullableText, coverage: nullableText, unit: z.string().trim().min(1).max(40), costType: z.enum(costTypes),
  itemType: z.enum(['SERVICE', 'PRODUCT']), supplierId: z.string().min(2).nullable(),
  reorderPoint: z.number().nonnegative().finite(), minimumOrderQuantity: z.number().positive().finite(),
  unitCost: z.number().nonnegative().nullable(), costBatchSize: z.number().positive().nullable(), active: z.boolean(), notes: z.string().trim().max(1000).nullable()
}).superRefine((value, context) => {
  if (!value.id && value.itemType === 'PRODUCT' && !value.supplierId) context.addIssue({ code: 'custom', message: 'يجب اختيار التاجر للمنتج.' })
})
const ruleSchema = z.object({
  id: z.string().optional(), serviceId: z.string().min(2), ruleType: z.enum(pricingRuleTypes),
  exactQuantity: z.number().positive().nullable(), minQuantity: z.number().positive().nullable(), maxQuantity: z.number().positive().nullable(),
  fixedPrice: z.number().nonnegative().nullable(), unitPrice: z.number().nonnegative().nullable(), priority: z.number().int().min(0).max(1000), active: z.boolean()
}).superRefine((value, context) => {
  if ((value.ruleType === 'EXACT_QUANTITY' || value.ruleType === 'BULK_PRICE') && value.exactQuantity === null) context.addIssue({ code: 'custom', message: 'الكمية المحددة مطلوبة.' })
  if (value.ruleType === 'MIN_QUANTITY' && value.minQuantity === null) context.addIssue({ code: 'custom', message: 'الحد الأدنى للكمية مطلوب.' })
  if (value.ruleType === 'QUANTITY_TIER' && value.minQuantity === null && value.maxQuantity === null) context.addIssue({ code: 'custom', message: 'حد واحد على الأقل مطلوب للنطاق.' })
  if (value.fixedPrice === null && value.unitPrice === null) context.addIssue({ code: 'custom', message: 'يجب إدخال سعر ثابت أو سعر للوحدة.' })
  if (value.fixedPrice !== null && value.unitPrice !== null) context.addIssue({ code: 'custom', message: 'اختر سعرًا ثابتًا أو سعر وحدة، وليس كليهما.' })
  if (value.minQuantity !== null && value.maxQuantity !== null && value.minQuantity > value.maxQuantity) context.addIssue({ code: 'custom', message: 'الحد الأدنى أكبر من الحد الأعلى.' })
})

function validationError(error: z.ZodError): Error { return new Error(error.issues[0]?.message ?? 'البيانات المدخلة غير صحيحة.') }

export const catalogService = {
  listCategories: repository.listCategories,
  saveCategory(input: ServiceCategoryInput) {
    const parsed = categorySchema.safeParse(input)
    if (!parsed.success) throw validationError(parsed.error)
    return repository.saveCategory(parsed.data)
  },
  deleteCategory(id: string) {
    if (!id || id.length > 100) throw new Error('معرّف التصنيف غير صالح.')
    repository.deleteCategory(id)
  },
  listServices: repository.listServices,
  saveService(input: ServiceInput) {
    const parsed = serviceSchema.safeParse(input)
    if (!parsed.success) throw validationError(parsed.error)
    return repository.saveService({ ...parsed.data, costType: 'PER_UNIT', costBatchSize: null })
  },
  setServiceActive(id: string, active: boolean) { repository.setServiceActive(id, active) },
  deleteService(id: string) {
    if (!id || id.length > 100) throw new Error('معرّف الخدمة غير صالح.')
    repository.deleteService(id)
  },
  listRules: repository.listPricingRules,
  saveRule(input: PricingRuleInput): PriceRule {
    const parsed = ruleSchema.safeParse(input)
    if (!parsed.success) throw validationError(parsed.error)
    const candidate = { id: parsed.data.id ?? 'new-rule', ...parsed.data } as PriceRule
    const conflict = repository.listPricingRules(parsed.data.serviceId).find((rule) => rule.id !== parsed.data.id && ruleSpecificity(rule) === ruleSpecificity(candidate) && rangesOverlap(rule, candidate))
    if (candidate.active && conflict) throw new Error('تتعارض هذه القاعدة مع قاعدة نشطة موجودة لنفس نطاق الكمية.')
    return repository.savePricingRule(parsed.data)
  },
  setRuleActive(id: string, active: boolean) {
    if (active) {
      const candidate = repository.getPricingRule(id)
      if (!candidate) throw new Error('قاعدة السعر المطلوبة غير موجودة.')
      const conflict = repository.listPricingRules(candidate.serviceId).find((rule) => rule.id !== id && rule.active && ruleSpecificity(rule) === ruleSpecificity(candidate) && rangesOverlap(rule, candidate))
      if (conflict) throw new Error('لا يمكن تفعيل القاعدة لأنها تتعارض مع قاعدة نشطة.')
    }
    repository.setPricingRuleActive(id, active)
  },
  deleteRule(id: string) { repository.deletePricingRule(id) },
  calculate(serviceId: string, quantity: number): PricingResult {
    const service = repository.getService(serviceId)
    if (!service) throw new Error('الخدمة المطلوبة غير موجودة.')
    return calculatePrice(service, repository.listPricingRules(serviceId), quantity)
  }
}
