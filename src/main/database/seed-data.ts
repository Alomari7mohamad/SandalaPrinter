import type { CostType, PricingRuleType } from '../../shared/pricing/pricing-types'

export interface CategorySeed { id: string; code: string; nameAr: string; sortOrder: number }
export interface ServiceSeed {
  id: string; code: string; nameAr: string; categoryId: string; paperType: string | null; size: string | null
  colorMode: string | null; coverage: string | null; unit: string; costType: CostType; unitCost: number | null
  costBatchSize: number | null; active: boolean; notes: string | null
}
export interface PricingRuleSeed {
  id: string; serviceId: string; ruleType: PricingRuleType; exactQuantity: number | null; minQuantity: number | null
  maxQuantity: number | null; fixedPrice: number | null; unitPrice: number | null; priority: number; active: boolean
}

export const coreCategories: CategorySeed[] = [
  { id: 'cat-paper', code: 'PAPER_PRINT', nameAr: 'طباعة ورق', sortOrder: 1 },
  { id: 'cat-bristol', code: 'BRISTOL', nameAr: 'بروستول', sortOrder: 2 },
  { id: 'cat-chromo', code: 'CHROMO', nameAr: 'خرومو', sortOrder: 3 },
  { id: 'cat-business-cards', code: 'BUSINESS_CARDS', nameAr: 'كروت العمل', sortOrder: 4 },
  { id: 'cat-notebooks', code: 'NOTEBOOKS', nameAr: 'دفاتر الملاحظات', sortOrder: 5 },
  { id: 'cat-note-cards', code: 'NOTE_CARDS', nameAr: 'بطاقات ملاحظات', sortOrder: 6 },
  { id: 'cat-envelopes', code: 'ENVELOPES', nameAr: 'طباعة مغلفات', sortOrder: 7 },
  { id: 'cat-folders', code: 'FOLDERS', nameAr: 'الدوسيات', sortOrder: 8 },
  { id: 'cat-other-products', code: 'OTHER_PRODUCTS', nameAr: 'أخرى', sortOrder: 9 }
]

const paperServices: ServiceSeed[] = [
  ['paper-a4-bw', 'PAPER_A4_BW', 'طباعة ورق A4 أبيض وأسود', 'cat-paper', 'ورق عادي', 'A4', 'أبيض وأسود', null, 'ورقة', 'PER_UNIT', 0.075, null, true, null],
  ['paper-a4-color', 'PAPER_A4_COLOR', 'طباعة ورق A4 ملون', 'cat-paper', 'ورق عادي', 'A4', 'ملون', null, 'ورقة', 'PER_UNIT', 0.16, null, true, null],
  ['paper-a3-bw', 'PAPER_A3_BW', 'طباعة ورق A3 أبيض وأسود', 'cat-paper', 'ورق عادي', 'A3', 'أبيض وأسود', null, 'ورقة', 'PER_UNIT', 0.18, null, true, null],
  ['paper-a3-color', 'PAPER_A3_COLOR', 'طباعة ورق A3 ملون', 'cat-paper', 'ورق عادي', 'A3', 'ملون', null, 'ورقة', 'PER_UNIT', 0.32, null, true, null],
  ['bristol-a4-bw', 'BRISTOL_A4_BW', 'بروستول A4 أبيض وأسود', 'cat-bristol', 'بروستول', 'A4', 'أبيض وأسود', null, 'ورقة', 'PER_UNIT', 0.18, null, true, null],
  ['bristol-a4-color', 'BRISTOL_A4_COLOR', 'بروستول A4 ملون', 'cat-bristol', 'بروستول', 'A4', 'ملون', null, 'ورقة', 'PER_UNIT', 0.26, null, true, null],
  ['bristol-a3-bw', 'BRISTOL_A3_BW', 'بروستول A3 أبيض وأسود', 'cat-bristol', 'بروستول', 'A3', 'أبيض وأسود', null, 'ورقة', 'PER_UNIT', 0.55, null, true, null],
  ['bristol-a3-color', 'BRISTOL_A3_COLOR', 'بروستول A3 ملون', 'cat-bristol', 'بروستول', 'A3', 'ملون', null, 'ورقة', 'PER_UNIT', 0.70, null, true, null],
  ['chromo-a4-bw', 'CHROMO_A4_BW', 'خرومو A4 أبيض وأسود', 'cat-chromo', 'خرومو', 'A4', 'أبيض وأسود', null, 'ورقة', 'PER_UNIT', 0.32, null, true, null],
  ['chromo-a4-color-light', 'CHROMO_A4_COLOR_LIGHT', 'خرومو A4 ملون خفيف', 'cat-chromo', 'خرومو', 'A4', 'ملون', 'خفيف', 'ورقة', 'PER_UNIT', 0.40, null, true, null],
  ['chromo-a4-color-heavy', 'CHROMO_A4_COLOR_HEAVY', 'خرومو A4 ملون ثقيل', 'cat-chromo', 'خرومو', 'A4', 'ملون', 'ثقيل', 'ورقة', 'PER_UNIT', 0.80, null, true, null],
  ['chromo-a3-bw', 'CHROMO_A3_BW', 'خرومو A3 أبيض وأسود', 'cat-chromo', 'خرومو', 'A3', 'أبيض وأسود', null, 'ورقة', 'PER_UNIT', 0.60, null, true, null],
  ['chromo-a3-color-normal', 'CHROMO_A3_COLOR_NORMAL', 'خرومو A3 ملون عادي', 'cat-chromo', 'خرومو', 'A3', 'ملون', 'عادي', 'ورقة', 'PER_UNIT', 0.75, null, true, null],
  ['chromo-a3-color-heavy', 'CHROMO_A3_COLOR_HEAVY', 'خرومو A3 ملون ثقيل', 'cat-chromo', 'خرومو', 'A3', 'ملون', 'ثقيل', 'ورقة', 'PER_UNIT', 0.90, null, true, null]
].map((values) => {
  const [id, code, nameAr, categoryId, paperType, size, colorMode, coverage, unit, costType, unitCost, costBatchSize, active, notes] = values
  return { id, code, nameAr, categoryId, paperType, size, colorMode, coverage, unit, costType, unitCost, costBatchSize, active, notes } as ServiceSeed
})

const notebook = (id: string, code: string, size: string, pages: number, colorMode: string, cost: number): ServiceSeed => ({
  id, code, nameAr: `دفتر ملاحظات ${size} / ${pages} صفحة / ${colorMode}`, categoryId: 'cat-notebooks', paperType: 'ورق عادي', size,
  colorMode, coverage: `${pages} صفحة`, unit: 'دفتر', costType: 'PER_UNIT', unitCost: cost, costBatchSize: null, active: true, notes: null
})

export const coreServices: ServiceSeed[] = [
  ...paperServices,
  { id: 'business-card-single', code: 'BUSINESS_CARD_SINGLE', nameAr: 'كروت عمل وجه واحد', categoryId: 'cat-business-cards', paperType: 'خرومو', size: 'كرت عمل', colorMode: 'وجه واحد', coverage: null, unit: 'كرت', costType: 'PER_UNIT', unitCost: 0.06, costBatchSize: null, active: true, notes: 'التكلفة الأساسية للكرت الواحد.' },
  { id: 'business-card-double', code: 'BUSINESS_CARD_DOUBLE', nameAr: 'كروت عمل وجهين', categoryId: 'cat-business-cards', paperType: 'خرومو', size: 'كرت عمل', colorMode: 'وجهين', coverage: null, unit: 'كرت', costType: 'PER_UNIT', unitCost: 0.085, costBatchSize: null, active: true, notes: 'التكلفة الأساسية للكرت الواحد.' },
  notebook('notebook-a4-50-bw', 'NOTEBOOK_A4_50_BW', 'A4', 50, 'أبيض وأسود', 5),
  notebook('notebook-a4-50-color', 'NOTEBOOK_A4_50_COLOR', 'A4', 50, 'ملون', 6),
  notebook('notebook-a4-100-bw', 'NOTEBOOK_A4_100_BW', 'A4', 100, 'أبيض وأسود', 8),
  notebook('notebook-a4-100-color', 'NOTEBOOK_A4_100_COLOR', 'A4', 100, 'ملون', 10),
  notebook('notebook-a5-50-bw', 'NOTEBOOK_A5_50_BW', 'A5', 50, 'أبيض وأسود', 4),
  notebook('notebook-a5-50-color', 'NOTEBOOK_A5_50_COLOR', 'A5', 50, 'ملون', 5),
  notebook('notebook-a5-100-bw', 'NOTEBOOK_A5_100_BW', 'A5', 100, 'أبيض وأسود', 6),
  notebook('notebook-a5-100-color', 'NOTEBOOK_A5_100_COLOR', 'A5', 100, 'ملون', 7),
  { id: 'note-cards-9x9', code: 'NOTE_CARDS_9X9', nameAr: 'بطاقات ملاحظات صغيرة 9×9', categoryId: 'cat-note-cards', paperType: 'ورق ملاحظات', size: '9×9 سم', colorMode: null, coverage: 'بلوك', unit: 'بطاقة', costType: 'PER_UNIT', unitCost: 0.035, costBatchSize: null, active: true, notes: 'التكلفة الأساسية للبطاقة الواحدة.' },
  { id: 'envelope-printing', code: 'ENVELOPE_PRINTING', nameAr: 'طباعة مغلفات', categoryId: 'cat-envelopes', paperType: 'مغلفات', size: null, colorMode: null, coverage: null, unit: 'مغلف', costType: 'PER_UNIT', unitCost: null, costBatchSize: null, active: true, notes: 'تحتاج التكلفة وقواعد البيع إلى تحديد لاحق.' },
  { id: 'product-black-binder', code: 'BLACK_BINDER', nameAr: 'كلاسر أسود', categoryId: 'cat-folders', paperType: 'منتجات الدوسيات', size: null, colorMode: null, coverage: null, unit: 'قطعة', costType: 'PER_UNIT', unitCost: null, costBatchSize: null, active: true, notes: 'السعر والتكلفة غير محددين بعد.' },
  { id: 'product-nylon-folder', code: 'NYLON_FOLDER', nameAr: 'دوسية نايلون', categoryId: 'cat-folders', paperType: 'منتجات الدوسيات', size: null, colorMode: null, coverage: null, unit: 'قطعة', costType: 'PER_UNIT', unitCost: null, costBatchSize: null, active: true, notes: 'السعر والتكلفة غير محددين بعد.' },
  { id: 'product-bag-folder', code: 'BAG_FOLDER', nameAr: 'دوسية أكياس', categoryId: 'cat-folders', paperType: 'منتجات الدوسيات', size: null, colorMode: null, coverage: null, unit: 'قطعة', costType: 'PER_UNIT', unitCost: null, costBatchSize: null, active: true, notes: 'السعر والتكلفة غير محددين بعد.' },
  { id: 'product-nylon-bag', code: 'NYLON_BAG', nameAr: 'كيس نايلون', categoryId: 'cat-other-products', paperType: 'منتجات أخرى', size: null, colorMode: null, coverage: null, unit: 'قطعة', costType: 'PER_UNIT', unitCost: null, costBatchSize: null, active: true, notes: 'السعر والتكلفة غير محددين بعد.' },
  { id: 'product-large-staples', code: 'LARGE_STAPLES', nameAr: 'دبابيس كبيرة', categoryId: 'cat-other-products', paperType: 'منتجات أخرى', size: null, colorMode: null, coverage: null, unit: 'علبة', costType: 'PER_UNIT', unitCost: null, costBatchSize: null, active: true, notes: 'السعر والتكلفة غير محددين بعد.' },
  { id: 'product-small-staples', code: 'SMALL_STAPLES', nameAr: 'دبابيس صغيرة', categoryId: 'cat-other-products', paperType: 'منتجات أخرى', size: null, colorMode: null, coverage: null, unit: 'علبة', costType: 'PER_UNIT', unitCost: null, costBatchSize: null, active: true, notes: 'السعر والتكلفة غير محددين بعد.' },
  { id: 'product-red-glue', code: 'RED_GLUE', nameAr: 'دبق أحمر', categoryId: 'cat-other-products', paperType: 'منتجات أخرى', size: null, colorMode: null, coverage: null, unit: 'عبوة', costType: 'PER_UNIT', unitCost: null, costBatchSize: null, active: true, notes: 'السعر والتكلفة غير محددين بعد.' }
]

const exact = (serviceId: string, quantity: number, price: number, order: number): PricingRuleSeed => ({
  id: `${serviceId}-exact-${quantity}`, serviceId, ruleType: 'EXACT_QUANTITY', exactQuantity: quantity, minQuantity: null, maxQuantity: null,
  fixedPrice: price, unitPrice: null, priority: 100 - order, active: true
})
const unitFrom = (serviceId: string, minQuantity: number, unitPrice: number): PricingRuleSeed => ({
  id: `${serviceId}-unit-from-${minQuantity}`, serviceId, ruleType: 'UNIT_PRICE', exactQuantity: null, minQuantity, maxQuantity: null,
  fixedPrice: null, unitPrice, priority: 20, active: true
})
const unitTier = (serviceId: string, minQuantity: number, maxQuantity: number | null, unitPrice: number, suffix: string): PricingRuleSeed => ({
  id: `${serviceId}-tier-${suffix}`, serviceId, ruleType: maxQuantity === null ? 'MIN_QUANTITY' : 'QUANTITY_TIER', exactQuantity: null,
  minQuantity, maxQuantity, fixedPrice: null, unitPrice, priority: 30, active: true
})

const paperPrices: Array<[string, number, number, number, number]> = [
  ['paper-a4-bw', 4, 17, 30, 0.25], ['paper-a4-color', 7, 30, 55, 0.40], ['paper-a3-bw', 9, 40, 70, 0.60], ['paper-a3-color', 11, 50, 90, 0.80],
  ['bristol-a4-bw', 9, 40, 70, 0.60], ['bristol-a4-color', 10, 45, 80, 0.70], ['bristol-a3-bw', 12, 55, 90, 0.80], ['bristol-a3-color', 14, 65, 110, 0.90],
  ['chromo-a4-bw', 10, 45, 85, 0.75], ['chromo-a4-color-light', 12, 50, 90, 0.80], ['chromo-a4-color-heavy', 20, 75, 125, 1.00],
  ['chromo-a3-bw', 13, 55, 100, 0.90], ['chromo-a3-color-normal', 15, 65, 110, 1.00], ['chromo-a3-color-heavy', 25, 100, 150, 1.20]
]

const paperRules = paperPrices.flatMap(([serviceId, price10, price50, price100, over100]) => [
  exact(serviceId, 10, price10, 1), exact(serviceId, 50, price50, 2), exact(serviceId, 100, price100, 3), unitFrom(serviceId, 101, over100)
])
const exactSeries = (serviceId: string, values: Array<[number, number]>) => values.map(([quantity, price], index) => exact(serviceId, quantity, price, index))
const notebookRules: Array<[string, number, number]> = [
  ['notebook-a4-50-bw', 15, 12], ['notebook-a4-50-color', 18, 15], ['notebook-a4-100-bw', 25, 20], ['notebook-a4-100-color', 30, 25],
  ['notebook-a5-50-bw', 12, 10], ['notebook-a5-50-color', 15, 12], ['notebook-a5-100-bw', 15, 12], ['notebook-a5-100-color', 18, 15]
]

export const corePricingRules: PricingRuleSeed[] = [
  ...paperRules,
  ...exactSeries('business-card-single', [[100, 40], [200, 60], [500, 80], [1000, 130]]),
  ...exactSeries('business-card-double', [[100, 50], [200, 80], [500, 140], [1000, 190]]),
  ...notebookRules.flatMap(([serviceId, regular, bulk]) => [unitTier(serviceId, 1, 4, regular, '1-4'), unitTier(serviceId, 5, null, bulk, '5-plus')]),
  ...exactSeries('note-cards-9x9', [[100, 10], [200, 17], [500, 35], [1000, 60]])
]
