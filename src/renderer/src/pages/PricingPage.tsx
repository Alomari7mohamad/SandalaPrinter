import { AlertTriangle, Calculator, Edit3, Plus, Save, Trash2 } from 'lucide-react'
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
    {services.length === 0 ? <div className="panel table-state">لا توجد خدمات. أضف خدمة أولًا.</div> : <div className="pricing-layout">
      <aside className="panel service-picker">
        <div className="service-picker-heading"><h2>اختيار الخدمة</h2><p>اختر الفئة أولًا، ثم اختر الخدمة المطلوبة.</p></div>
        <label>الفئة<select value={selectedCategoryKey} onChange={(event) => { const firstService = serviceGroups.find((group) => group.key === event.target.value)?.services[0]; if (firstService) setParams({ service: firstService.id }) }}>{serviceGroups.map((group) => <option key={group.key} value={group.key}>{group.label}</option>)}</select></label>
        <label>الخدمة<select value={selectedId} onChange={(event) => setParams({ service: event.target.value })}>{categoryServices.map((service) => <option key={service.id} value={service.id}>{service.nameAr}</option>)}</select></label>
        {selected && <div className="selected-service-card"><span>الخدمة المحددة</span><strong>{selected.nameAr}</strong><small>{selected.pricingRulesCount} قواعد سعر</small></div>}
      </aside>
      {selected && <div className="pricing-content">
        <section className="panel service-cost-card"><div><span className="eyebrow">معلومات الخدمة</span><h2>{selected.nameAr}</h2><p>{[selected.categoryName, selected.paperType, selected.size, selected.colorMode, selected.coverage].filter(Boolean).join(' • ')}</p></div><div className="cost-editor"><label>تكلفة الوحدة<input type="number" min="0" step="0.001" value={cost ?? ''} onChange={(e) => setCost(e.target.value === '' ? null : Number(e.target.value))} /></label><button className="primary-button" disabled={savingCost} onClick={() => void saveCost()}><Save size={17} /> {savingCost ? 'جارٍ الحفظ' : 'حفظ التكلفة'}</button></div></section>
        <section className="panel rules-panel"><div className="section-title"><div><h2>شرائح التسعير</h2><p>{rules.length} شريحة محفوظة — السعر يتغير تلقائيًا حسب الكمية</p></div><button className="primary-button" onClick={() => setEditingRule('new')}><Plus size={17} /> إضافة شريحة</button></div>{rules.length === 0 ? <div className="table-state"><AlertTriangle size={28} /><span>لا توجد شرائح تسعير لهذه الخدمة.</span></div> : <div className="table-scroll pricing-rules-scroll"><table className="data-table pricing-rules-table"><thead><tr><th>من — إلى</th><th>السعر</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>{rules.map((rule) => <tr key={rule.id}><td><b dir="ltr">{quantityLabel(rule)}</b><small>{ruleNames[rule.ruleType]}</small></td><td dir="ltr">{priceLabel(rule)}</td><td><button className={`badge badge-button ${rule.active ? 'success' : 'muted'}`} onClick={() => void toggleRule(rule)}>{rule.active ? 'نشطة' : 'معطلة'}</button></td><td><div className="row-actions"><button title="تعديل" onClick={() => setEditingRule(rule)}><Edit3 size={16} /></button><button className="danger" title="حذف" onClick={() => void deleteRule(rule)}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>}</section>
        <section className="panel pricing-tester"><div className="section-title"><div><span className="eyebrow">أداة تطوير وتشغيل</span><h2>تجربة التسعير</h2></div><Calculator size={24} /></div><div className="tester-form"><label>الكمية<input type="number" inputMode="numeric" min="1" step="1" value={quantity} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setQuantity(event.target.value)} /></label><div className={`automatic-calculation-status${calculating ? ' calculating' : ''}`}>{calculating ? 'جارٍ الحساب...' : 'يتم الحساب تلقائيًا'}</div></div>{result && <div className={`pricing-result ${result.requiresManualPricing ? 'manual' : ''}`}>{result.requiresManualPricing ? <div className="manual-warning"><AlertTriangle size={24} /><div><b>لا توجد قاعدة سعر محددة لهذه الكمية.</b><span>يلزم إدخال السعر يدويًا.</span></div></div> : <div className="result-grid"><div><span>سعر الوحدة المستخدم</span><b>{money(result.unitSalePrice)}</b></div><div><span>سعر البيع</span><b>{money(result.salePrice)}</b></div><div><span>التكلفة</span><b>{money(result.cost)}</b></div><div><span>الربح</span><b className={(result.profit ?? 0) < 0 ? 'negative' : 'positive'}>{money(result.profit)}</b></div><div><span>هامش الربح</span><b>{result.profitMargin?.toFixed(2)}%</b></div></div>}{result.warnings.filter((warning) => !warning.startsWith('لا توجد') && !warning.startsWith('يلزم')).map((warning) => <p className="result-warning" key={warning}>{warning}</p>)}</div>}</section>
      </div>}
    </div>}
    {selected && editingRule && <RuleDialog serviceId={selected.id} fixedQuantity={usesFixedQuantities(selected)} rule={editingRule === 'new' ? undefined : editingRule} onClose={() => setEditingRule(null)} onSaved={(saved) => { const isNewRule = !rules.some((row) => row.id === saved.id); setRules((rows) => rows.some((row) => row.id === saved.id) ? rows.map((row) => row.id === saved.id ? saved : row) : [...rows, saved]); if (isNewRule) changeRuleCount(saved.serviceId, 1); setEditingRule(null); setResult(null); window.dispatchEvent(new Event('sandala:catalog-changed')) }} />}
  </div>
}
