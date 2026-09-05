import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { InventoryItemDto, MaterialRequirementInput, PricingRuleInput, ServiceCategoryDto, ServiceDto, ServiceInput, SupplierDto } from '../../../shared/contracts'
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
  const [materials,setMaterials]=useState<InventoryItemDto[]>([])
  const [requirements,setRequirements]=useState<MaterialRequirementInput[]>([])
  useEffect(() => {
    void Promise.all([window.desktopApi.shortages.listSuppliers(),window.desktopApi.inventory.list(),service ? window.desktopApi.catalog.listMaterialRequirements(service.id) : Promise.resolve([])])
      .then(([supplierRows,inventoryRows,recipe])=>{setSuppliers(supplierRows);setMaterials(inventoryRows.filter((item)=>item.itemKind==='RAW_MATERIAL'));setRequirements(recipe.map((item)=>({inventoryItemId:item.inventoryItemId,quantityPerUnit:item.quantityPerUnit})))})
      .catch(()=>{setSuppliers([]);setMaterials([])})
  }, [service?.id])
  const text = (key: keyof ServiceInput, value: string) => setForm((current) => ({ ...current, [key]: value.trim() === '' ? null : value }))
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setSaving(true)
    try {
      const saved = await window.desktopApi.catalog.saveService({ ...form, costType: 'PER_UNIT', costBatchSize: null })
      await window.desktopApi.catalog.saveMaterialRequirements(saved.id,requirements)
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
  const addMaterial=(inventoryItemId:string)=>{if(!inventoryItemId || requirements.some((item)=>item.inventoryItemId===inventoryItemId)) return;setRequirements((current)=>[...current,{inventoryItemId,quantityPerUnit:1}])}
  return <Modal title={service ? 'تعديل المنتج' : 'إضافة منتج'} onClose={onClose} wide>
    <form onSubmit={submit} className="dialog-form">
      {error && <div className="alert error form-span">{error}</div>}
      <label>طريقة العمل<select value={form.itemType} onChange={(e) => setForm({ ...form, itemType: e.target.value as 'SERVICE' | 'PRODUCT', supplierId: e.target.value === 'PRODUCT' ? form.supplierId : null })}><option value="SERVICE">خدمة يتم تنفيذها</option><option value="PRODUCT">خدمة/منتج جاهز للبيع</option></select></label>
      <label>الاسم بالعربية<input required dir="rtl" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} /></label>
      <label>השם בעברית<input dir="rtl" value={form.nameHe ?? ''} onChange={(e) => text('nameHe', e.target.value)} placeholder="اختياري" /></label>
      <label>الرمز<input required dir="ltr" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })} /></label>
      <label>التصنيف<select required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>{categories.map((category) => <option key={category.id} value={category.id}>{category.nameAr}</option>)}</select></label>
      <label>نوع الورق<input value={form.paperType ?? ''} onChange={(e) => text('paperType', e.target.value)} /></label>
      <label>الحجم<input value={form.size ?? ''} onChange={(e) => text('size', e.target.value)} /></label>
      <label>نوع الطباعة<input value={form.colorMode ?? ''} onChange={(e) => text('colorMode', e.target.value)} /></label>
      <label>التغطية/التفصيل<input value={form.coverage ?? ''} onChange={(e) => text('coverage', e.target.value)} /></label>
      <label>الوحدة<input required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></label>
      {form.itemType === 'PRODUCT' && <><label>التاجر<select required={!form.id} value={form.supplierId ?? ''} onChange={(e) => setForm({ ...form, supplierId: e.target.value || null })}><option value="">{form.id ? 'غير محدد — يمكن الحفظ' : 'اختر التاجر'}</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.companyName} — {supplier.name}</option>)}</select></label><label>حد الانتقال إلى النواقص<input type="number" min="0" step="any" value={form.reorderPoint} onChange={(e) => setForm({ ...form, reorderPoint: Number(e.target.value) })} /></label><label>كمية الطلب الدنيا<input type="number" min="0.01" step="any" value={form.minimumOrderQuantity} onChange={(e) => setForm({ ...form, minimumOrderQuantity: Number(e.target.value) })} /></label></>}
      <label>تكلفة الوحدة<input type="number" min="0" step="0.001" value={form.unitCost ?? ''} onChange={(e) => setForm({ ...form, unitCost: e.target.value === '' ? null : Number(e.target.value) })} placeholder={`تكلفة ${form.unit || 'الوحدة'} الواحدة`} /></label>
      {!hasComplexPricing && <label>سعر البيع للوحدة<input type="number" min="0" step="0.001" value={salePrice ?? ''} onChange={(e) => setSalePrice(e.target.value === '' ? null : Number(e.target.value))} placeholder="اختياري" /></label>}
      {hasComplexPricing && <div className="complex-pricing-note form-span"><div><b>لهذه الخدمة أسعار متعددة حسب الكمية.</b><span>تظهر أسعار البيع في صفحة الأسعار ويجب تعديلها من هناك حتى تبقى قواعد الكميات صحيحة.</span></div><button type="button" onClick={() => { onClose(); navigate(`/pricing?service=${service?.id}`) }}>فتح صفحة الأسعار</button></div>}
      <section className="material-recipe form-span"><div className="material-recipe-heading"><div><b>المواد الخام المستخدمة</b><small>حدد استهلاك المادة لإنتاج وحدة واحدة من هذه الخدمة. سيُضرب تلقائياً في كمية الطلب.</small></div><select value="" onChange={(e)=>addMaterial(e.target.value)}><option value="">إضافة مادة خام إلى الوصفة</option>{materials.filter((material)=>!requirements.some((item)=>item.inventoryItemId===material.id)).map((material)=><option key={material.id} value={material.id}>{material.name} — {material.unit}</option>)}</select></div>{requirements.length===0?<div className="recipe-empty">لم تُضف مواد خام. سيستمر الحساب السابق لهذه الخدمة إن كان موجوداً.</div>:<div className="recipe-list">{requirements.map((requirement)=>{const material=materials.find((item)=>item.id===requirement.inventoryItemId);return <div className="recipe-row" key={requirement.inventoryItemId}><span><b>{material?.name ?? 'مادة خام'}</b><small>لكل وحدة من الخدمة</small></span><label>الكمية<input type="number" inputMode="decimal" min="0.000001" step="any" value={requirement.quantityPerUnit} onChange={(e)=>setRequirements((current)=>current.map((item)=>item.inventoryItemId===requirement.inventoryItemId?{...item,quantityPerUnit:Number(e.target.value)}:item))}/><em>{material?.unit ?? ''}</em></label><button type="button" className="danger-icon" onClick={()=>setRequirements((current)=>current.filter((item)=>item.inventoryItemId!==requirement.inventoryItemId))}>حذف</button></div>})}</div>}</section>
      <label className="form-span">ملاحظات<textarea rows={3} value={form.notes ?? ''} onChange={(e) => text('notes', e.target.value)} /></label>
      <label className="checkbox-label form-span"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> العنصر نشط</label>
      <div className="dialog-actions form-span"><button type="button" className="secondary-button" onClick={onClose}>إلغاء</button><button className="primary-button" disabled={saving || (!form.id && form.itemType === 'PRODUCT' && !form.supplierId)}>{saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}</button></div>
    </form>
  </Modal>
}
