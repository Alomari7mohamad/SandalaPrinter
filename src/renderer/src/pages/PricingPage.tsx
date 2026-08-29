import { AlertTriangle, Calculator, CircleDollarSign, Edit3, Eye, EyeOff, Layers3, Plus, Save, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ServiceDto, ServiceInput } from '../../../shared/contracts'
import { usesFixedQuantities, type PriceRule, type PricingResult } from '../../../shared/pricing/pricing-types'
import { PageHeader } from '../components/PageHeader'
import { RuleDialog } from '../components/RuleDialog'
import { getArabicError } from '../utils/errors'
import { formatCurrency } from '../utils/format'

const ruleNames: Record<PriceRule['ruleType'], string> = { EXACT_QUANTITY: 'كمية محددة', MIN_QUANTITY: 'حد أدنى', QUANTITY_TIER: 'نطاق كمية', UNIT_PRICE: 'سعر للوحدة', BULK_PRICE: 'سعر دفعة', FIXED_PRICE: 'سعر ثابت' }
const quantityLabel = (rule: PriceRule) => rule.exactQuantity !== null ? String(rule.exactQuantity) : rule.minQuantity !== null && rule.maxQuantity !== null ? `${rule.minQuantity} – ${rule.maxQuantity}` : rule.minQuantity !== null ? `${rule.minQuantity} فأكثر` : rule.maxQuantity !== null ? `حتى ${rule.maxQuantity}` : 'كل الكميات'
const priceLabel = (rule: PriceRule) => rule.unitPrice !== null ? `${rule.unitPrice} ₪ / وحدة` : `${rule.fixedPrice ?? 0} ₪`
const money = (value: number | null) => value === null ? 'غير محدد' : formatCurrency(value, 4)
const serviceInput = (service: ServiceDto, cost: number | null): ServiceInput => ({ id: service.id, code: service.code, nameAr: service.nameAr, nameHe: service.nameHe, categoryId: service.categoryId ?? '', paperType: service.paperType, size: service.size, colorMode: service.colorMode, coverage: service.coverage, unit: service.unit, itemType: service.itemType, supplierId: service.supplierId, reorderPoint: service.reorderPoint, minimumOrderQuantity: service.minimumOrderQuantity, costType: 'PER_UNIT', unitCost: cost, costBatchSize: null, active: service.active, notes: service.notes })
const categoryKey = (service: ServiceDto) => service.categoryId ?? '__uncategorized__'

export function PricingPage() {
  const [params, setParams] = useSearchParams()
  const [services, setServices] = useState<ServiceDto[]>([])
  const [rules, setRules] = useState<PriceRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingRule, setEditingRule] = useState<PriceRule | 'new' | null>(null)
  const [quantity, setQuantity] = useState('100')
  const [serviceSearch, setServiceSearch] = useState('')
  const [showCalculationDetails, setShowCalculationDetails] = useState(false)
  const [result, setResult] = useState<PricingResult | null>(null)
  const [calculating, setCalculating] = useState(false)
  const selectedId = params.get('service') ?? services[0]?.id ?? ''
  const selected = useMemo(() => services.find((service) => service.id === selectedId), [services, selectedId])
  const serviceGroups = useMemo(() => {
    const groups = new Map<string, { key: string; label: string; services: ServiceDto[] }>()
    services.forEach((service) => {
      const key = categoryKey(service)
      const group = groups.get(key) ?? { key, label: service.categoryName || 'بدون فئة', services: [] }
      group.services.push(service)
      groups.set(key, group)
    })
    return [...groups.values()].map((group) => ({ ...group, services: group.services.sort((a, b) => a.nameAr.localeCompare(b.nameAr, 'ar')) }))
  }, [services])
  const selectedCategoryKey = selected ? categoryKey(selected) : serviceGroups[0]?.key ?? ''
  const categoryServices = serviceGroups.find((group) => group.key === selectedCategoryKey)?.services ?? []
  const visibleCategoryServices = useMemo(() => {
    const query = serviceSearch.trim().toLocaleLowerCase('ar')
    if (!query) return categoryServices
    return categoryServices.filter((service) => `${service.nameAr} ${service.nameHe ?? ''} ${service.code ?? ''}`.toLocaleLowerCase('ar').includes(query))
  }, [categoryServices, serviceSearch])
  const [cost, setCost] = useState<number | null>(null)
  const [savingCost, setSavingCost] = useState(false)

  const loadServices = () => window.desktopApi.catalog.listServices().then((rows) => { setServices(rows); if (!params.get('service') && rows[0]) setParams({ service: rows[0].id }, { replace: true }) }).catch((cause) => setError(getArabicError(cause, 'تعذر تحميل الخدمات.'))).finally(() => setLoading(false))
  useEffect(() => {
    void loadServices()
  }, [])
  useEffect(() => { if (!selectedId) return; setResult(null); window.desktopApi.pricing.listRules(selectedId).then(setRules).catch((cause) => setError(getArabicError(cause, 'تعذر تحميل قواعد التسعير.'))) }, [selectedId])
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
  }, [selected?.id, selected?.unitCost, quantity, rules])

  const saveCost = async () => { if (!selected) return; setSavingCost(true); setError(''); try { const saved = await window.desktopApi.catalog.saveService(serviceInput(selected, cost)); setServices((rows) => rows.map((row) => row.id === saved.id ? saved : row)); setResult(null); window.dispatchEvent(new Event('sandala:catalog-changed')) } catch (cause) { setError(getArabicError(cause, 'تعذر حفظ التكلفة.')) } finally { setSavingCost(false) } }
  const toggleRule = async (rule: PriceRule) => { try { await window.desktopApi.pricing.setRuleActive(rule.id, !rule.active); setRules((rows) => rows.map((row) => row.id === rule.id ? { ...row, active: !row.active } : row)); setResult(null); window.dispatchEvent(new Event('sandala:catalog-changed')) } catch (cause) { setError(getArabicError(cause)) } }
  const changeRuleCount = (serviceId: string, delta: number) => setServices((rows) => rows.map((row) => row.id === serviceId ? { ...row, pricingRulesCount: Math.max(0, row.pricingRulesCount + delta) } : row))
  const deleteRule = async (rule: PriceRule) => { if (!window.confirm('هل تريد حذف قاعدة السعر هذه؟')) return; try { await window.desktopApi.pricing.deleteRule(rule.id); setRules((rows) => rows.filter((row) => row.id !== rule.id)); changeRuleCount(rule.serviceId, -1); setResult(null); window.dispatchEvent(new Event('sandala:catalog-changed')) } catch (cause) { setError(getArabicError(cause, 'تعذر حذف قاعدة السعر.')) } }

  if (loading) return <div className="page"><PageHeader title="الأسعار" /><div className="panel table-state">جارٍ تحميل الأسعار...</div></div>
  return <div className="page pricing-page">
    <PageHeader title="الأسعار" subtitle="عدّل التكلفة وقواعد البيع واختبر أي كمية مباشرة" />
    {error && <div className="alert error">{error}</div>}
    {services.length === 0 ? <div className="panel table-state">لا توجد خدمات. أضف خدمة أولًا.</div> : <>
      <section className="panel pricing-selector-panel">
        <div className="pricing-selector-heading"><span><Layers3 size={20} /></span><div><h2>حدد الخدمة التي تريد تسعيرها</h2><p>اختر الفئة أولًا، ثم ابحث أو اختر المنتج أو الخدمة.</p></div></div>
        <div className="pricing-selector-fields">
          <label><span><b>1</b> الفئة</span><select value={selectedCategoryKey} onChange={(event) => { setServiceSearch(''); const firstService = serviceGroups.find((group) => group.key === event.target.value)?.services[0]; if (firstService) setParams({ service: firstService.id }) }}>{serviceGroups.map((group) => <option key={group.key} value={group.key}>{group.label}</option>)}</select></label>
          <label className="pricing-service-search"><span><Search size={15} /> بحث داخل الفئة</span><div><Search size={17} /><input value={serviceSearch} onChange={(event) => setServiceSearch(event.target.value)} placeholder="اكتب اسم الخدمة..." /></div></label>
          <label><span><b>2</b> المنتج أو الخدمة</span><select value={selectedId} onChange={(event) => setParams({ service: event.target.value })}>{visibleCategoryServices.length === 0 && <option value={selectedId}>لا توجد نتائج مطابقة</option>}{visibleCategoryServices.map((service) => <option key={service.id} value={service.id}>{service.nameAr}</option>)}</select></label>
        </div>
      </section>
      {selected && <>
        <section className="panel pricing-service-overview">
          <div className="pricing-service-identity"><span className="pricing-service-icon"><CircleDollarSign size={24} /></span><div><span className="eyebrow">الخدمة المحددة</span><h2>{selected.nameAr}</h2><p>{[selected.categoryName, selected.paperType, selected.size, selected.colorMode, selected.coverage].filter(Boolean).join(' • ') || 'لا توجد مواصفات إضافية'}</p></div></div>
          <div className="pricing-service-stats"><div><span>عدد الشرائح</span><b>{rules.length}</b></div><div><span>وحدة البيع</span><b>{selected.unit || 'وحدة'}</b></div></div>
          <div className="cost-editor"><label>تكلفة الوحدة<input type="number" min="0" step="0.001" value={cost ?? ''} onChange={(e) => setCost(e.target.value === '' ? null : Number(e.target.value))} /></label><button className="primary-button" disabled={savingCost} onClick={() => void saveCost()}><Save size={17} /> {savingCost ? 'جارٍ الحفظ' : 'حفظ التكلفة'}</button></div>
        </section>
        <div className="pricing-workspace-grid">
          <section className="panel pricing-rule-editor"><div className="section-title"><div><span className="eyebrow">قواعد البيع</span><h2>شرائح الأسعار</h2><p>{rules.length} شريحة محفوظة — طبّق سعرًا مختلفًا لكل نطاق كمية.</p></div><button className="primary-button" onClick={() => setEditingRule('new')}><Plus size={17} /> إضافة شريحة</button></div>{rules.length === 0 ? <div className="table-state"><AlertTriangle size={28} /><span>لا توجد شرائح تسعير لهذه الخدمة.</span></div> : <div className="pricing-rule-list">{rules.map((rule, index) => <article className={`pricing-rule-card${rule.active ? '' : ' disabled'}`} key={rule.id}><div className="pricing-rule-order">{index + 1}</div><div className="pricing-rule-range"><span>نطاق الكمية</span><b dir="ltr">{quantityLabel(rule)}</b><small>{ruleNames[rule.ruleType]}</small></div><div className="pricing-rule-price"><span>السعر داخل الشريحة</span><b dir="ltr">{priceLabel(rule)}</b></div><button className={`pricing-rule-status ${rule.active ? 'active' : ''}`} onClick={() => void toggleRule(rule)}><span />{rule.active ? 'نشطة' : 'معطلة'}</button><div className="pricing-rule-actions"><button title="تعديل الشريحة" onClick={() => setEditingRule(rule)}><Edit3 size={17} /><span>تعديل</span></button><button className="danger" title="حذف الشريحة" onClick={() => void deleteRule(rule)}><Trash2 size={17} /></button></div></article>)}</div>}</section>
          <aside className="panel pricing-live-calculator"><div className="section-title"><div><span className="eyebrow">حساب فوري</span><h2>جرّب أي كمية</h2><p>يتحدث السعر مباشرة عند تغيير الكمية.</p></div><Calculator size={24} /></div><div className="pricing-calculator-body"><label className="pricing-quantity-field"><span>الكمية المطلوبة</span><input type="number" inputMode="numeric" min="1" step="1" value={quantity} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setQuantity(event.target.value)} /></label><div className={`automatic-calculation-status${calculating ? ' calculating' : ''}`}>{calculating ? 'جارٍ الحساب...' : 'الحساب التلقائي فعال'}</div>{result && <div className={`pricing-result ${result.requiresManualPricing ? 'manual' : ''}`}>{result.requiresManualPricing ? <div className="manual-warning"><AlertTriangle size={24} /><div><b>لا توجد قاعدة لهذه الكمية</b><span>أضف شريحة تغطي هذه الكمية.</span></div></div> : <><div className="pricing-sale-highlight"><span>السعر المحسوب</span><b>{money(result.salePrice)}</b><small>سعر الوحدة المستخدم: {money(result.unitSalePrice)}</small></div><button type="button" className="calculation-details-toggle" onClick={() => setShowCalculationDetails((current) => !current)}>{showCalculationDetails ? <EyeOff size={16} /> : <Eye size={16} />}{showCalculationDetails ? 'إخفاء التكلفة والربح' : 'إظهار التكلفة والربح'}</button>{showCalculationDetails && <div className="pricing-detail-list"><div><span>التكلفة</span><b>{money(result.cost)}</b></div><div><span>الربح</span><b className={(result.profit ?? 0) < 0 ? 'negative' : 'positive'}>{money(result.profit)}</b></div><div><span>هامش الربح</span><b>{result.profitMargin?.toFixed(2)}%</b></div></div>}</>}{result.warnings.filter((warning) => !warning.startsWith('لا توجد') && !warning.startsWith('يلزم')).map((warning) => <p className="result-warning" key={warning}>{warning}</p>)}</div>}</div></aside>
        </div>
      </>}
    </>}
    {selected && editingRule && <RuleDialog serviceId={selected.id} fixedQuantity={usesFixedQuantities(selected)} rule={editingRule === 'new' ? undefined : editingRule} onClose={() => setEditingRule(null)} onSaved={(saved) => { const isNewRule = !rules.some((row) => row.id === saved.id); setRules((rows) => rows.some((row) => row.id === saved.id) ? rows.map((row) => row.id === saved.id ? saved : row) : [...rows, saved]); if (isNewRule) changeRuleCount(saved.serviceId, 1); setEditingRule(null); setResult(null); window.dispatchEvent(new Event('sandala:catalog-changed')) }} />}
  </div>
}
