import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PricingRuleInput, ServiceCategoryDto, ServiceDto, ServiceInput, SupplierDto } from '../../../shared/contracts'
import type { PriceRule } from '../../../shared/pricing/pricing-types'
import { Modal } from './Modal'
import { getArabicError } from '../utils/errors'
import { editableUnitPriceRule } from '../utils/pricing-display'

const empty: ServiceInput = { code: '', nameAr: '', nameHe: null, categoryId: '', paperType: null, size: null, colorMode: null, coverage: null, unit: 'قطعة', itemType: 'SERVICE', supplierId: null, reorderPoint: 1, minimumOrderQuantity: 1, costType: 'PER_UNIT', unitCost: null, costBatchSize: null, active: true, notes: null }
const toInput = (service?: ServiceDto): ServiceInput => service ? { id: service.id, code: service.code, nameAr: service.nameAr, nameHe: service.nameHe, categoryId: service.categoryId ?? '', paperType: service.paperType, size: service.size, colorMode: service.colorMode, coverage: service.coverage, unit: service.unit, itemType: service.itemType, supplierId: service.supplierId, reorderPoint: service.reorderPoint, minimumOrderQuantity: service.minimumOrderQuantity, costType: 'PER_UNIT', unitCost: service.costType === 'PER_100' && service.unitCost !== null ? service.unitCost / (service.costBatchSize ?? 100) : service.unitCost, costBatchSize: null, active: service.active, notes: service.notes } : empty

export function ServiceDialog({ service, pricingRules, categories, onClose, onSaved }: { service?: ServiceDto; pricingRules: PriceRule[]; categories: ServiceCategoryDto[]; onClose: () => void; onSaved: (service: ServiceDto) => void }) {
  const navigate = useNavigate()
  const editablePriceRule = editableUnitPriceRule(pricingRules)
  const hasComplexPricing = pricingRules.some((rule) => rule.active) && !editablePriceRule
  const [form, setForm] = useState<ServiceInput>(() => ({ ...toInput(service), categoryId: service?.categoryId ?? categories[0]?.id ?? '' }))
  const [salePrice, setSalePrice] = useState<number | null>(editablePriceRule?.unitPrice ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([])
  useEffect(() => { void window.desktopApi.shortages.listSuppliers().then(setSuppliers).catch(() => setSuppliers([])) }, [])
  const text = (key: keyof ServiceInput, value: string) => setForm((current) => ({ ...current, [key]: value.trim() === '' ? null : value }))
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setSaving(true)
    try {
      const saved = await window.desktopApi.catalog.saveService({ ...form, costType: 'PER_UNIT', costBatchSize: null })
      if (!hasComplexPricing) {
        if (salePrice === null && editablePriceRule) await window.desktopApi.pricing.deleteRule(editablePriceRule.id)
        if (salePrice !== null) {
          const priceRule: PricingRuleInput = { id: editablePriceRule?.id, serviceId: saved.id, ruleType: 'UNIT_PRICE', exactQuantity: null, minQuantity: 1, maxQuantity: null, fixedPrice: null, unitPrice: salePrice, priority: 10, active: true }
          await window.desktopApi.pricing.saveRule(priceRule)
        }
      }
      window.dispatchEvent(new Event('sandala:catalog-changed'))
      onSaved(saved)
    } catch (cause) { setError(getArabicError(cause, 'تعذر حفظ الخدمة وسعر البيع.')) } finally { setSaving(false) }
  }
  return <Modal title={service ? 'تعديل الخدمة أو المنتج' : 'عنصر جديد'} onClose={onClose} wide>
    <form onSubmit={submit} className="dialog-form">
      {error && <div className="alert error form-span">{error}</div>}
      <label>نوع العنصر<select value={form.itemType} onChange={(e) => setForm({ ...form, itemType: e.target.value as 'SERVICE' | 'PRODUCT', supplierId: e.target.value === 'PRODUCT' ? form.supplierId : null })}><option value="SERVICE">خدمة</option><option value="PRODUCT">منتج يُباع في المحل</option></select></label>
      <label>الاسم بالعربية<input required dir="rtl" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} /></label>
      <label>השם בעברית<input dir="rtl" value={form.nameHe ?? ''} onChange={(e) => text('nameHe', e.target.value)} placeholder="اختياري" /></label>
      <label>الرمز<input required dir="ltr" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })} /></label>
      <label>التصنيف<select required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>{categories.map((category) => <option key={category.id} value={category.id}>{category.nameAr}</option>)}</select></label>
      <label>نوع الورق<input value={form.paperType ?? ''} onChange={(e) => text('paperType', e.target.value)} /></label>
      <label>الحجم<input value={form.size ?? ''} onChange={(e) => text('size', e.target.value)} /></label>
      <label>نوع الطباعة<input value={form.colorMode ?? ''} onChange={(e) => text('colorMode', e.target.value)} /></label>
      <label>التغطية/التفصيل<input value={form.coverage ?? ''} onChange={(e) => text('coverage', e.target.value)} /></label>
      <label>الوحدة<input required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></label>
      {form.itemType === 'PRODUCT' && <><label>التاجر<select required value={form.supplierId ?? ''} onChange={(e) => setForm({ ...form, supplierId: e.target.value || null })}><option value="">اختر التاجر</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.companyName} — {supplier.name}</option>)}</select></label><label>حد الانتقال إلى النواقص<input type="number" min="0" step="any" value={form.reorderPoint} onChange={(e) => setForm({ ...form, reorderPoint: Number(e.target.value) })} /></label><label>كمية الطلب الدنيا<input type="number" min="0.01" step="any" value={form.minimumOrderQuantity} onChange={(e) => setForm({ ...form, minimumOrderQuantity: Number(e.target.value) })} /></label></>}
      <label>تكلفة الوحدة<input type="number" min="0" step="0.001" value={form.unitCost ?? ''} onChange={(e) => setForm({ ...form, unitCost: e.target.value === '' ? null : Number(e.target.value) })} placeholder={`تكلفة ${form.unit || 'الوحدة'} الواحدة`} /></label>
      {!hasComplexPricing && <label>سعر البيع للوحدة<input type="number" min="0" step="0.001" value={salePrice ?? ''} onChange={(e) => setSalePrice(e.target.value === '' ? null : Number(e.target.value))} placeholder="اختياري" /></label>}
      {hasComplexPricing && <div className="complex-pricing-note form-span"><div><b>لهذه الخدمة أسعار متعددة حسب الكمية.</b><span>تظهر أسعار البيع في صفحة الأسعار ويجب تعديلها من هناك حتى تبقى قواعد الكميات صحيحة.</span></div><button type="button" onClick={() => { onClose(); navigate(`/pricing?service=${service?.id}`) }}>فتح صفحة الأسعار</button></div>}
      <label className="form-span">ملاحظات<textarea rows={3} value={form.notes ?? ''} onChange={(e) => text('notes', e.target.value)} /></label>
      <label className="checkbox-label form-span"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> العنصر نشط</label>
      <div className="dialog-actions form-span"><button type="button" className="secondary-button" onClick={onClose}>إلغاء</button><button className="primary-button" disabled={saving || (form.itemType === 'PRODUCT' && !form.supplierId)}>{saving ? 'جارٍ الحفظ...' : 'حفظ العنصر'}</button></div>
    </form>
  </Modal>
}
