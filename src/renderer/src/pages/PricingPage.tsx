import { useConfirm } from '../components/ConfirmationProvider'
import { AlertTriangle, Calculator, CircleDollarSign, Edit3, Eye, EyeOff, Layers3, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ServiceCategoryDto, ServiceDto, ServiceInput } from '../../../shared/contracts'
import { usesFixedQuantities, type PriceRule, type PricingResult } from '../../../shared/pricing/pricing-types'
import { PageHeader } from '../components/PageHeader'
import { ServiceDialog } from '../components/ServiceDialog'
import { RuleDialog } from '../components/RuleDialog'
import { getArabicError } from '../utils/errors'
import { formatCurrency } from '../utils/format'
import { catalogBranches } from '../../../shared/catalog-hierarchy'

const ruleNames: Record<PriceRule['ruleType'], string> = { EXACT_QUANTITY: 'كمية محددة', MIN_QUANTITY: 'حد أدنى', QUANTITY_TIER: 'نطاق كمية', UNIT_PRICE: 'سعر للوحدة', BULK_PRICE: 'سعر دفعة', FIXED_PRICE: 'سعر ثابت' }
const quantityLabel = (rule: PriceRule) => rule.exactQuantity !== null ? String(rule.exactQuantity) : rule.minQuantity !== null && rule.maxQuantity !== null ? `${rule.minQuantity} – ${rule.maxQuantity}` : rule.minQuantity !== null ? `${rule.minQuantity} فأكثر` : rule.maxQuantity !== null ? `حتى ${rule.maxQuantity}` : 'كل الكميات'
const priceLabel = (rule: PriceRule) => rule.unitPrice !== null ? `${rule.unitPrice} ₪ / وحدة` : `${rule.fixedPrice ?? 0} ₪`
const money = (value: number | null) => value === null ? 'غير محدد' : formatCurrency(value, 4)
const serviceInput = (service: ServiceDto, cost: number | null): ServiceInput => ({ id: service.id, code: service.code, nameAr: service.nameAr, nameHe: service.nameHe, categoryId: service.categoryId, paperType: service.paperType, size: service.size, colorMode: service.colorMode, coverage: service.coverage, unit: service.unit, itemType: service.itemType, supplierId: null, reorderPoint: service.reorderPoint, minimumOrderQuantity: service.minimumOrderQuantity, costType: 'PER_UNIT', unitCost: cost, costBatchSize: null, active: service.active, notes: service.notes })

export function PricingPage() {
  const confirm = useConfirm()
  const [params, setParams] = useSearchParams()
  const [editingProduct, setEditingProduct] = useState(false)
  const [categories, setCategories] = useState<ServiceCategoryDto[]>([])
  const [services, setServices] = useState<ServiceDto[]>([])
  const [rules, setRules] = useState<PriceRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingRule, setEditingRule] = useState<PriceRule | 'new' | null>(null)
  const [quantity, setQuantity] = useState('100')
  const [showCalculationDetails, setShowCalculationDetails] = useState(false)
  const [result, setResult] = useState<PricingResult | null>(null)
  const [calculating, setCalculating] = useState(false)
  const requested = services.find((service) => service.id === params.get('service'))
  const itemType = params.get('type') === 'SERVICE' ? 'SERVICE' : params.get('type') === 'PRODUCT' ? 'PRODUCT' : requested?.itemType ?? 'PRODUCT'
  const branches = useMemo(() => catalogBranches(categories, services, itemType), [categories, services, itemType])
  const linkedBranch = branches.find((branch) => branch.children.some((child) => child.items.some((item) => item.id === requested?.id)))
  const mainId = params.get('main') ?? linkedBranch?.id ?? ''
  const branch = branches.find((group) => group.id === mainId)
  const secondaryId = params.get('secondary') ?? branch?.children.find((child) => child.items.some((item) => item.id === requested?.id))?.id ?? ''
  const secondary = branch?.children.find((child) => child.id === secondaryId)
  const selected = secondary?.items.find((item) => item.id === requested?.id)
  const selectedId = selected?.id ?? ''
  const itemLabel = itemType === 'PRODUCT' ? 'المنتج' : 'الخدمة'
  const changeSelection = (next: Record<string, string>) => {
    setEditingRule(null); setEditingProduct(false); setResult(null); setRules([]); setError('')
    setParams(next)
  }
  const chooseMain = (id: string) => {
    const next: Record<string, string> = { type: itemType, main: id }
    const children = branches.find((group) => group.id === id)?.children ?? []
    if (children.length === 1) {
      next.secondary = children[0]!.id
      if (children[0]!.items.length === 1) next.service = children[0]!.items[0]!.id
    }
    changeSelection(next)
  }
  const chooseSecondary = (id: string) => {
    const next: Record<string, string> = { type: itemType, main: mainId, secondary: id }
    const items = branch?.children.find((child) => child.id === id)?.items ?? []
    if (items.length === 1) next.service = items[0]!.id
    changeSelection(next)
  }
  const [cost, setCost] = useState<number | null>(null)
  const [savingCost, setSavingCost] = useState(false)

  const loadServices = () => Promise.all([window.desktopApi.catalog.listServices(), window.desktopApi.catalog.listCategories()]).then(([rows, groups]) => { setCategories(groups); setServices(rows.filter((service) => service.active)) }).catch((cause) => setError(getArabicError(cause, 'تعذر تحميل المنتجات والخدمات.'))).finally(() => setLoading(false))
  useEffect(() => {
    void loadServices()
  }, [])
  useEffect(() => {
    let cancelled = false
    setRules([]); setResult(null)
    if (selectedId) window.desktopApi.pricing.listRules(selectedId).then((rows) => { if (!cancelled) setRules(rows) }).catch((cause) => { if (!cancelled) setError(getArabicError(cause, 'تعذر تحميل قواعد التسعير.')) })
    return () => { cancelled = true }
  }, [selectedId])
  useEffect(() => { setCost(selected?.unitCost ?? null) }, [selected])
  useEffect(() => {
    const amount = Number(quantity)
    if (!selected || quantity.trim() === '' || !Number.isFinite(amount) || amount <= 0) { setResult(null); setCalculating(false); return }
    let cancelled = false
    setCalculating(true)
    const timer = window.setTimeout(() => {
      window.desktopApi.pricing.calculate(selected.id, amount)
        .then((calculated) => { if (!cancelled) setResult(calculated) })
        .catch((cause) => { if (!cancelled) { setResult(null); setError(getArabicError(cause, 'تعذر تجربة السعر.')) } })
        .finally(() => { if (!cancelled) setCalculating(false) })
    }, 200)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [selected?.id, selected?.unitCost, selected?.regularSalePrice, selected?.offerSalePrice, quantity, rules])

  const saveCost = async () => { if (!selected) return; setSavingCost(true); setError(''); try { const saved = await window.desktopApi.catalog.saveService(serviceInput(selected, cost)); setServices((rows) => rows.map((row) => row.id === saved.id ? saved : row)); setResult(null); window.dispatchEvent(new Event('sandala:catalog-changed')) } catch (cause) { setError(getArabicError(cause, 'تعذر حفظ التكلفة.')) } finally { setSavingCost(false) } }
  const toggleRule = async (rule: PriceRule) => { try { await window.desktopApi.pricing.setRuleActive(rule.id, !rule.active); setRules((rows) => rows.map((row) => row.id === rule.id ? { ...row, active: !row.active } : row)); setResult(null); window.dispatchEvent(new Event('sandala:catalog-changed')) } catch (cause) { setError(getArabicError(cause)) } }
  const changeRuleCount = (serviceId: string, delta: number) => setServices((rows) => rows.map((row) => row.id === serviceId ? { ...row, pricingRulesCount: Math.max(0, row.pricingRulesCount + delta) } : row))
  const deleteRule = async (rule: PriceRule) => { if (!await confirm('هل تريد حذف قاعدة السعر هذه؟')) return; try { await window.desktopApi.pricing.deleteRule(rule.id); setRules((rows) => rows.filter((row) => row.id !== rule.id)); changeRuleCount(rule.serviceId, -1); setResult(null); window.dispatchEvent(new Event('sandala:catalog-changed')) } catch (cause) { setError(getArabicError(cause, 'تعذر حذف قاعدة السعر.')) } }

  if (loading) return <div className="page"><PageHeader title="الأسعار" /><div className="panel table-state">جارٍ تحميل الأسعار...</div></div>
  return <div className="page pricing-page">
    <PageHeader title="الأسعار" subtitle="عدّل التكلفة وقواعد البيع واختبر أي كمية مباشرة" />
    {error && <div className="alert error">{error}</div>}
    {services.length === 0 ? <div className="panel table-state">لا توجد منتجات أو خدمات. أضف منتجًا أو خدمة أولًا.</div> : <>
      <section className="panel pricing-selector-panel">
        <div className="pricing-selector-heading"><span><Layers3 size={20} /></span><div><h2>حدد المنتج أو الخدمة للتسعير</h2><p>اختر الفئة الرئيسية، ثم الثانوية، ثم الصنف لتحديد أسعاره.</p></div></div>
        <div className="category-type-tabs" role="group" aria-label="نوع الصنف للتسعير">
          <button type="button" className={itemType === 'PRODUCT' ? 'active' : ''} aria-pressed={itemType === 'PRODUCT'} onClick={() => { if (itemType !== 'PRODUCT') changeSelection({ type: 'PRODUCT' }) }}>المنتجات</button>
          <button type="button" className={itemType === 'SERVICE' ? 'active' : ''} aria-pressed={itemType === 'SERVICE'} onClick={() => { if (itemType !== 'SERVICE') changeSelection({ type: 'SERVICE' }) }}>الخدمات</button>
        </div>
        <div className="pricing-selector-fields">
          <label><span><b>1</b> الفئة الرئيسية</span><select name="pricingMainCategory" value={branch?.id ?? ''} onChange={(event) => chooseMain(event.target.value)}><option value="" disabled hidden>اختر الفئة الرئيسية</option>{branches.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
          <label><span><b>2</b> الفئة الثانوية</span><select name="pricingSecondaryCategory" disabled={!branch} value={secondary?.id ?? ''} onChange={(event) => chooseSecondary(event.target.value)}><option value="" disabled hidden>اختر الفئة الثانوية</option>{branch?.children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}</select></label>
          <label><span><b>3</b> {itemLabel}</span><select name="pricingItem" disabled={!secondary} value={selectedId} onChange={(event) => changeSelection({ type: itemType, main: mainId, secondary: secondaryId, service: event.target.value })}><option value="" disabled hidden>اختر {itemLabel}</option>{secondary?.items.map((item) => <option key={item.id} value={item.id}>{item.nameAr}</option>)}</select></label>
        </div>
        {branches.length === 0 && <p className="table-state">لا توجد {itemType === 'PRODUCT' ? 'منتجات' : 'خدمات'} نشطة للتسعير.</p>}
      </section>
      {!selected && branches.length > 0 && <div className="panel table-state">اختر الفئة الرئيسية والثانوية ثم {itemLabel} لعرض الأسعار وتعديلها.</div>}
      {selected && <>
        <section className="panel pricing-service-overview">
          <div className="pricing-service-identity"><span className="pricing-service-icon"><CircleDollarSign size={24} /></span><div><span className="eyebrow">الخدمة المحددة</span><h2>{selected.nameAr}</h2><p>{[selected.categoryName, selected.itemType === 'SERVICE' ? selected.paperType : null, selected.size, selected.colorMode].filter(Boolean).join(' • ') || 'لا توجد مواصفات إضافية'}</p></div></div>
          <div className="pricing-service-stats"><div><span>عدد الشرائح</span><b>{rules.length}</b></div><div><span>وحدة البيع</span><b>{selected.unit || 'وحدة'}</b></div></div>
          <div className="cost-editor"><label>تكلفة الوحدة<input type="number" min="0" step="0.001" value={cost ?? ''} onChange={(e) => setCost(e.target.value === '' ? null : Number(e.target.value))} /></label><button className="primary-button" disabled={savingCost} onClick={() => void saveCost()}><Save size={17} /> {savingCost ? 'جارٍ الحفظ' : 'حفظ التكلفة'}</button></div>
        </section>
        <div className="pricing-workspace-grid">
          {selected.itemType === 'PRODUCT' && selected.regularSalePrice != null ? <section className="panel product-price-editor"><div className="section-title"><h2>أسعار المنتج</h2><button className="primary-button" onClick={() => setEditingProduct(true)}><Edit3 size={17} /> تعديل الأسعار</button></div><div className="product-price-summary"><div><span>سعر البيع</span><b>{money(selected.regularSalePrice)}</b></div><div><span>سعر العرض</span><b>{money(selected.offerSalePrice ?? null)}</b></div><div><span>السعر المعتمد</span><b>{money(selected.offerSalePrice ?? selected.regularSalePrice)}</b></div></div></section> : <section className="panel pricing-rule-editor"><div className="section-title"><div><span className="eyebrow">قواعد البيع</span><h2>شرائح الأسعار</h2><p>{rules.length} شريحة محفوظة — طبّق سعرًا مختلفًا لكل نطاق كمية.</p></div><button className="primary-button" onClick={() => setEditingRule('new')}><Plus size={17} /> إضافة شريحة</button></div>{rules.length === 0 ? <div className="table-state"><AlertTriangle size={28} /><span>لا توجد شرائح تسعير لهذه الخدمة.</span></div> : <div className="pricing-rule-list">{rules.map((rule, index) => <article className={`pricing-rule-card${rule.active ? '' : ' disabled'}`} key={rule.id}><div className="pricing-rule-order">{index + 1}</div><div className="pricing-rule-range"><span>نطاق الكمية</span><b dir="ltr">{quantityLabel(rule)}</b><small>{ruleNames[rule.ruleType]}</small></div><div className="pricing-rule-price"><span>السعر داخل الشريحة</span><b dir="ltr">{priceLabel(rule)}</b></div><button className={`pricing-rule-status ${rule.active ? 'active' : ''}`} onClick={() => void toggleRule(rule)}><span />{rule.active ? 'نشطة' : 'معطلة'}</button><div className="pricing-rule-actions"><button title="تعديل الشريحة" onClick={() => setEditingRule(rule)}><Edit3 size={17} /><span>تعديل</span></button><button className="danger" title="حذف الشريحة" onClick={() => void deleteRule(rule)}><Trash2 size={17} /></button></div></article>)}</div>}</section>}
          <aside className="panel pricing-live-calculator"><div className="section-title"><div><span className="eyebrow">حساب فوري</span><h2>جرّب أي كمية</h2><p>يتحدث السعر مباشرة عند تغيير الكمية.</p></div><Calculator size={24} /></div><div className="pricing-calculator-body"><label className="pricing-quantity-field"><span>الكمية المطلوبة</span><input type="number" inputMode="numeric" min="1" step="1" value={quantity} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setQuantity(event.target.value)} /></label><div className={`automatic-calculation-status${calculating ? ' calculating' : ''}`}>{calculating ? 'جارٍ الحساب...' : 'الحساب التلقائي فعال'}</div>{result && <div className={`pricing-result ${result.requiresManualPricing ? 'manual' : ''}`}>{result.requiresManualPricing ? <div className="manual-warning"><AlertTriangle size={24} /><div><b>لا توجد قاعدة لهذه الكمية</b><span>أضف شريحة تغطي هذه الكمية.</span></div></div> : <><div className="pricing-sale-highlight"><span>السعر المحسوب</span><b>{money(result.salePrice)}</b><small>سعر الوحدة المستخدم: {money(result.unitSalePrice)}</small></div><button type="button" className="calculation-details-toggle" onClick={() => setShowCalculationDetails((current) => !current)}>{showCalculationDetails ? <EyeOff size={16} /> : <Eye size={16} />}{showCalculationDetails ? 'إخفاء التكلفة والربح' : 'إظهار التكلفة والربح'}</button>{showCalculationDetails && <div className="pricing-detail-list"><div><span>التكلفة</span><b>{money(result.cost)}</b></div><div><span>الربح</span><b className={(result.profit ?? 0) < 0 ? 'negative' : 'positive'}>{money(result.profit)}</b></div><div><span>هامش الربح</span><b>{result.profitMargin?.toFixed(2)}%</b></div></div>}</>}{result.warnings.filter((warning) => !warning.startsWith('لا توجد') && !warning.startsWith('يلزم')).map((warning) => <p className="result-warning" key={warning}>{warning}</p>)}</div>}</div></aside>
        </div>
      </>}
    </>}
    {selected && editingProduct && <ServiceDialog itemType="PRODUCT" service={selected} categories={categories.filter((category) => category.itemType === 'PRODUCT')} pricingRules={rules} onClose={() => setEditingProduct(false)} onSaved={(saved) => { setServices((rows) => rows.map((row) => row.id === saved.id ? saved : row)); setEditingProduct(false) }} />}
    {selected && editingRule && <RuleDialog serviceId={selected.id} fixedQuantity={usesFixedQuantities(selected)} rule={editingRule === 'new' ? undefined : editingRule} onClose={() => setEditingRule(null)} onSaved={(saved) => { const isNewRule = !rules.some((row) => row.id === saved.id); setRules((rows) => rows.some((row) => row.id === saved.id) ? rows.map((row) => row.id === saved.id ? saved : row) : [...rows, saved]); if (isNewRule) changeRuleCount(saved.serviceId, 1); setEditingRule(null); setResult(null); window.dispatchEvent(new Event('sandala:catalog-changed')) }} />}
  </div>
}
