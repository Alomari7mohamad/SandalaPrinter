import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CatalogItemType, PricingRuleInput, ServiceCategoryDto, ServiceDto, ServiceInput } from '../../../shared/contracts'
import type { PriceRule } from '../../../shared/pricing/pricing-types'
import { Modal } from './Modal'
import { getArabicError } from '../utils/errors'
import { editableUnitPriceRule } from '../utils/pricing-display'

const empty: ServiceInput = { code: '', nameAr: '', nameHe: null, categoryId: '', paperType: null, size: null, colorMode: null, coverage: null, unit: 'قطعة', itemType: 'SERVICE', supplierId: null, reorderPoint: 1, minimumOrderQuantity: 1, costType: 'PER_UNIT', unitCost: null, costBatchSize: null, active: true, notes: null }
const toInput = (service?: ServiceDto): ServiceInput => service ? { id: service.id, code: service.code, nameAr: service.nameAr, nameHe: service.nameHe, categoryId: service.categoryId ?? '', paperType: service.paperType, size: service.size, colorMode: service.colorMode, coverage: service.coverage, unit: service.unit, itemType: 'SERVICE', supplierId: null, reorderPoint: service.reorderPoint, minimumOrderQuantity: service.minimumOrderQuantity, costType: 'PER_UNIT', unitCost: service.costType === 'PER_100' && service.unitCost !== null ? service.unitCost / (service.costBatchSize ?? 100) : service.unitCost, costBatchSize: null, active: service.active, notes: service.notes } : empty

export function ServiceDialog({ service, itemType, pricingRules, categories, onClose, onSaved }: { service?: ServiceDto; itemType: CatalogItemType; pricingRules: PriceRule[]; categories: ServiceCategoryDto[]; onClose: () => void; onSaved: (service: ServiceDto) => void }) {
  const itemLabel = itemType === 'PRODUCT' ? 'المنتج' : 'الخدمة'
  const navigate = useNavigate()
  const editablePriceRule = editableUnitPriceRule(pricingRules)
  const hasComplexPricing = pricingRules.some((rule) => rule.active) && !editablePriceRule
  const [form, setForm] = useState<ServiceInput>(() => ({ ...toInput(service), itemType, categoryId: service?.categoryId ?? (categories.length === 1 ? categories[0]!.id : null) }))
  const sameProductPrice = Boolean(itemType === 'PRODUCT' && editablePriceRule && (service?.offerSalePrice ?? service?.regularSalePrice) === editablePriceRule.unitPrice)
  const [salePrice, setSalePrice] = useState<number | null>(sameProductPrice ? service?.regularSalePrice ?? null : editablePriceRule?.unitPrice ?? null)
  const [offerPrice, setOfferPrice] = useState<number | null>(sameProductPrice ? service?.offerSalePrice ?? null : null)
  const [priceChanged, setPriceChanged] = useState(false)
  const [mainCategoryId, setMainCategoryId] = useState(() => {
    const current = categories.find((category) => category.id === service?.categoryId)
    return current?.parentId ?? current?.id ?? ''
  })
  const mainCategories = categories.filter((category) => !category.parentId && category.itemType === itemType)
  const secondaryCategories = categories.filter((category) => category.parentId === mainCategoryId && category.itemType === itemType)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const text = (key: keyof ServiceInput, value: string) => setForm((current) => ({ ...current, [key]: value.trim() === '' ? null : value }))
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setSaving(true)
    let failureContext = `تعذر حفظ بيانات ${itemLabel}.`
    try {
      const saved = await window.desktopApi.catalog.saveService({ ...form, ...(itemType === 'PRODUCT' && !hasComplexPricing && (!service || priceChanged) ? { regularSalePrice: salePrice, offerSalePrice: offerPrice } : {}), supplierId: null, costType: 'PER_UNIT', costBatchSize: null })
      setForm((current) => ({ ...current, id: saved.id }))
      if (itemType === 'SERVICE' && !hasComplexPricing) {
        failureContext = 'تم حفظ بيانات الخدمة، لكن تعذر حفظ سعرها.'
        if (salePrice === null && editablePriceRule) await window.desktopApi.pricing.deleteRule(editablePriceRule.id)
        if (salePrice !== null) {
          const priceRule: PricingRuleInput = { id: editablePriceRule?.id, serviceId: saved.id, ruleType: 'UNIT_PRICE', exactQuantity: null, minQuantity: 1, maxQuantity: null, fixedPrice: null, unitPrice: salePrice, priority: 10, active: true }
          await window.desktopApi.pricing.saveRule(priceRule)
        }
      }
      window.dispatchEvent(new Event('sandala:catalog-changed'))
      onSaved(saved)
    } catch (cause) { setError(getArabicError(cause, failureContext)) } finally { setSaving(false) }
  }
  return <Modal title={service ? `تعديل ${itemLabel}` : itemType === 'PRODUCT' ? 'إضافة منتج' : 'إضافة خدمة'} onClose={onClose} wide>
    <form onSubmit={submit} className="dialog-form" onInvalid={(event) => {
      event.preventDefault()
      const invalid = Array.from(event.currentTarget.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input:invalid, select:invalid'))
      setError(`لم يتم الحفظ.\nتفاصيل الخطأ:\n${invalid.map((field) => `${field.closest('label')?.firstChild?.textContent?.trim() || field.name}: ${field.validationMessage}`).join('\n')}`)
      invalid[0]?.focus()
    }}>
      {error && <div className="alert error form-span" role="alert">{error}</div>}
      <label>الاسم بالعربية<input required dir="rtl" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} /></label>
      <label>השם בעברית<input dir="rtl" value={form.nameHe ?? ''} onChange={(e) => text('nameHe', e.target.value)} placeholder="اختياري" /></label>
      <label>الرمز<input required dir="ltr" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })} /></label>
      <label>الفئة الرئيسية<select required name="mainCategory" value={mainCategoryId} onChange={(event) => { setMainCategoryId(event.target.value); setForm({ ...form, categoryId: event.target.value }) }}><option value="" disabled hidden>اختر الفئة الرئيسية</option>{mainCategories.map((category) => <option key={category.id} value={category.id}>{category.nameAr}</option>)}</select></label>
      <label>الفئة الثانوية<select required name="secondaryCategory" disabled={!mainCategoryId} value={form.categoryId ?? ''} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}><option value={mainCategoryId}>عام</option>{secondaryCategories.map((category) => <option key={category.id} value={category.id}>{category.nameAr}</option>)}</select></label>
      {itemType === 'SERVICE' && <label>نوع الورق<input value={form.paperType ?? ''} onChange={(e) => text('paperType', e.target.value)} /></label>}
      <label>الحجم<input value={form.size ?? ''} onChange={(e) => text('size', e.target.value)} /></label>
      <label>نوع الطباعة<input value={form.colorMode ?? ''} onChange={(e) => text('colorMode', e.target.value)} /></label>
      <label>الوحدة<input required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></label>
      <label>تكلفة الوحدة<input type="number" min="0" step="0.001" value={form.unitCost ?? ''} onChange={(e) => setForm({ ...form, unitCost: e.target.value === '' ? null : Number(e.target.value) })} placeholder={`تكلفة ${form.unit || 'الوحدة'} الواحدة`} /></label>
      {(!hasComplexPricing) && <label>سعر البيع للوحدة<input name="regularPrice" required={itemType === 'PRODUCT' && !service} type="number" min="0" step="0.001" value={salePrice ?? ''} onChange={(e) => { setSalePrice(e.target.value === '' ? null : Number(e.target.value)); setPriceChanged(true) }} placeholder={itemType === 'PRODUCT' ? 'سعر البيع' : 'اختياري'} /></label>}
      {itemType === 'PRODUCT' && !hasComplexPricing && <label>سعر العرض للوحدة<input type="number" name="offerPrice" min="0" step="any" value={offerPrice ?? ''} onChange={(event) => { setOfferPrice(event.target.value === '' ? null : Number(event.target.value)); setPriceChanged(true) }} placeholder="اتركه فارغًا لاعتماد سعر البيع" /></label>}
      {itemType === 'PRODUCT' && !hasComplexPricing && <output className="product-effective-price form-span">السعر المعتمد للطلب <b>{offerPrice ?? salePrice ?? 'غير محدد'} ₪</b></output>}
      {hasComplexPricing && <div className="complex-pricing-note form-span"><div><b>تختلف أسعار البيع حسب الكمية.</b><span>تظهر أسعار البيع في صفحة الأسعار ويجب تعديلها من هناك حتى تبقى قواعد الكميات صحيحة.</span></div><button type="button" onClick={() => { onClose(); navigate(`/pricing?service=${service?.id}`) }}>فتح صفحة الأسعار</button></div>}
      <label className="checkbox-label form-span"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> العنصر نشط</label>
      <div className="dialog-actions form-span"><button type="button" className="secondary-button" onClick={onClose}>إلغاء</button><button className="primary-button" disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}</button></div>
    </form>
  </Modal>
}
