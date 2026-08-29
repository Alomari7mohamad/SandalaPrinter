import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Eye, EyeOff, ImagePlus, LoaderCircle, Plus, ShoppingCart, Trash2, UserRound } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import type { CreateOrderResult, ServiceDto } from '../../../shared/contracts'
import { calculateDraftTotals, type OrderDiscountType } from '../../../shared/orders/order-draft'
import { usesFixedQuantities, type PriceRule, type PricingResult } from '../../../shared/pricing/pricing-types'
import { PageHeader } from '../components/PageHeader'
import { ARABIC_WITH_LATIN_DIGITS, formatCurrency, formatNumber } from '../utils/format'
import { getArabicError } from '../utils/errors'

interface DraftItem { key: string; service: ServiceDto; quantity: number; pricing: PricingResult }
interface StoredOrderDraft {
  items: DraftItem[]
  customerName: string
  customerPhone: string
  deliveryAddress: string
  businessLogoDataUrl: string | null
  notes: string
  customerPanelOpen: boolean
  discountType: Exclude<OrderDiscountType, 'NONE'>
  discountValue: string
}

interface ServiceGroup { id: string; name: string; categoryIds: string[]; services: ServiceDto[] }

const preferredGroups = [
  { id: 'paper', name: 'طباعة ورق', categoryIds: ['cat-paper'] },
  { id: 'bristol', name: 'طباعة بروستول', categoryIds: ['cat-bristol'] },
  { id: 'chromo', name: 'طباعة خرومو', categoryIds: ['cat-chromo'] },
  { id: 'notebooks', name: 'دفاتر وملاحظات', categoryIds: ['cat-notebooks', 'cat-note-cards'] },
  { id: 'cards', name: 'طباعة كروت', categoryIds: ['cat-business-cards'] },
  { id: 'folders', name: 'الدوسيات', categoryIds: ['cat-folders'] },
  { id: 'other', name: 'أخرى', categoryIds: ['cat-other-products'] }
]

const DRAFT_STORAGE_KEY = 'sandala:new-order-draft:v1'
const emptyStoredDraft: StoredOrderDraft = { items: [], customerName: '', customerPhone: '', deliveryAddress: '', businessLogoDataUrl: null, notes: '', customerPanelOpen: false, discountType: 'FIXED', discountValue: '' }

function readStoredDraft(): StoredOrderDraft {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DRAFT_STORAGE_KEY) ?? 'null') as Partial<StoredOrderDraft> | null
    if (!parsed) return emptyStoredDraft
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [], customerName: parsed.customerName ?? '', customerPhone: parsed.customerPhone ?? '',
      deliveryAddress: parsed.deliveryAddress ?? '', businessLogoDataUrl: parsed.businessLogoDataUrl ?? null, notes: parsed.notes ?? '',
      customerPanelOpen: Boolean(parsed.customerPanelOpen), discountType: parsed.discountType === 'PERCENT' ? 'PERCENT' : 'FIXED', discountValue: parsed.discountValue ?? ''
    }
  } catch { return emptyStoredDraft }
}

export function NewOrderPage() {
  const [restoredDraft] = useState(readStoredDraft)
  const [services, setServices] = useState<ServiceDto[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [serviceRules, setServiceRules] = useState<PriceRule[]>([])
  const [rulesLoading, setRulesLoading] = useState(false)
  const [pricing, setPricing] = useState<PricingResult | null>(null)
  const [pricingLoading, setPricingLoading] = useState(false)
  const [items, setItems] = useState<DraftItem[]>(restoredDraft.items)
  const [customerName, setCustomerName] = useState(restoredDraft.customerName)
  const [customerPhone, setCustomerPhone] = useState(restoredDraft.customerPhone)
  const [deliveryAddress, setDeliveryAddress] = useState(restoredDraft.deliveryAddress)
  const [businessLogoDataUrl, setBusinessLogoDataUrl] = useState<string | null>(restoredDraft.businessLogoDataUrl)
  const [notes, setNotes] = useState(restoredDraft.notes)
  const [customerPanelOpen, setCustomerPanelOpen] = useState(restoredDraft.customerPanelOpen)
  const [showInternalDetails, setShowInternalDetails] = useState(false)
  const [discountType, setDiscountType] = useState<Exclude<OrderDiscountType, 'NONE'>>(restoredDraft.discountType)
  const [discountValue, setDiscountValue] = useState(restoredDraft.discountValue)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedOrder, setSavedOrder] = useState<CreateOrderResult | null>(null)
  const restoredPricesRefreshed = useRef(false)

  useEffect(() => {
    window.desktopApi.catalog.listServices().then((rows) => {
      const active = rows.filter((service) => service.active)
      setServices(active)
    }).catch((cause) => setError(getArabicError(cause, 'تعذر تحميل الخدمات.'))).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const draft: StoredOrderDraft = { items, customerName, customerPhone, deliveryAddress, businessLogoDataUrl, notes, customerPanelOpen, discountType, discountValue }
    const hasContent = items.length > 0 || Boolean(customerName || customerPhone || deliveryAddress || businessLogoDataUrl || notes || Number(discountValue) > 0)
    try {
      if (hasContent) window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
      else window.localStorage.removeItem(DRAFT_STORAGE_KEY)
    } catch { /* تعذر الحفظ محلياً، ولا يجب تعطيل إنشاء الطلب. */ }
  }, [items, customerName, customerPhone, deliveryAddress, businessLogoDataUrl, notes, customerPanelOpen, discountType, discountValue])

  useEffect(() => {
    if (restoredPricesRefreshed.current || services.length === 0 || restoredDraft.items.length === 0) return
    restoredPricesRefreshed.current = true
    Promise.all(restoredDraft.items.map(async (item) => {
      const currentService = services.find((service) => service.id === item.service.id)
      if (!currentService) return null
      try { return { ...item, service: currentService, pricing: await window.desktopApi.pricing.calculate(currentService.id, item.quantity) } }
      catch { return null }
    })).then((refreshed) => setItems(refreshed.filter((item): item is DraftItem => item !== null)))
  }, [services, restoredDraft.items])

  const selected = services.find((service) => service.id === selectedId)
  const fixedQuantity = Boolean(selected && usesFixedQuantities(selected))
  const quantityOptions = useMemo(() => [...new Set(serviceRules.map((rule) => rule.exactQuantity).filter((value): value is number => value !== null))].sort((a, b) => a - b), [serviceRules])

  useEffect(() => {
    setServiceRules([])
    if (!selected || !usesFixedQuantities(selected)) { setRulesLoading(false); return }
    let cancelled = false
    setRulesLoading(true)
    window.desktopApi.pricing.listRules(selected.id).then((rules) => {
      if (cancelled) return
      const activeRules = rules.filter((rule) => rule.active)
      setServiceRules(activeRules)
      const firstQuantity = activeRules.map((rule) => rule.exactQuantity).filter((value): value is number => value !== null).sort((a, b) => a - b)[0]
      setQuantity(firstQuantity ? String(firstQuantity) : '')
    }).catch((cause) => { if (!cancelled) setError(getArabicError(cause, 'تعذر تحميل كميات الخدمة.')) }).finally(() => { if (!cancelled) setRulesLoading(false) })
    return () => { cancelled = true }
  }, [selectedId])

  useEffect(() => {
    const numericQuantity = Number(quantity)
    setPricing(null)
    if (!selectedId || !Number.isFinite(numericQuantity) || numericQuantity <= 0) return
    if (fixedQuantity && !quantityOptions.includes(numericQuantity)) return
    let cancelled = false
    setPricingLoading(true)
    const timer = window.setTimeout(() => {
      window.desktopApi.pricing.calculate(selectedId, numericQuantity)
        .then((result) => { if (!cancelled) setPricing(result) })
        .catch((cause) => { if (!cancelled) setError(getArabicError(cause, 'تعذر حساب سعر الخدمة.')) })
        .finally(() => { if (!cancelled) setPricingLoading(false) })
    }, 180)
    return () => { cancelled = true; window.clearTimeout(timer); setPricingLoading(false) }
  }, [selectedId, quantity, fixedQuantity, quantityOptions])

  const serviceGroups = useMemo<ServiceGroup[]>(() => {
    const groupedCategoryIds = new Set(preferredGroups.flatMap((group) => group.categoryIds))
    const mainGroups = preferredGroups.map((group) => ({
      ...group,
      services: services.filter((service) => service.categoryId && group.categoryIds.includes(service.categoryId))
    })).filter((group) => group.services.length > 0)
    const otherGroups = new Map<string, ServiceGroup>()
    services.forEach((service) => {
      if (!service.categoryId || groupedCategoryIds.has(service.categoryId)) return
      const current = otherGroups.get(service.categoryId)
      if (current) current.services.push(service)
      else otherGroups.set(service.categoryId, { id: service.categoryId, name: service.categoryName, categoryIds: [service.categoryId], services: [service] })
    })
    return [...mainGroups, ...otherGroups.values()]
  }, [services])
  const selectedGroup = serviceGroups.find((group) => group.id === selectedGroupId)
  const serviceTypeLabel = (service: ServiceDto) => service.size?.trim() || service.paperType?.trim() || 'عام'
  const typeOptions = useMemo(() => [...new Set((selectedGroup?.services ?? []).map(serviceTypeLabel))], [selectedGroup])
  const effectiveSelectedType = selectedType || (typeOptions.length === 1 ? typeOptions[0]! : '')
  const servicesForType = useMemo(() => (selectedGroup?.services ?? []).filter((service) => serviceTypeLabel(service) === effectiveSelectedType), [selectedGroup, effectiveSelectedType])
  const numericDiscountValue = discountType === 'PERCENT' ? Math.min(Number(discountValue), 100) : Number(discountValue)
  const effectiveDiscountType: OrderDiscountType = Number.isFinite(numericDiscountValue) && numericDiscountValue > 0 ? discountType : 'NONE'
  const totals = useMemo(() => calculateDraftTotals(items.map((item) => ({ salePrice: item.pricing.salePrice ?? 0, cost: item.pricing.cost ?? 0 })), { type: effectiveDiscountType, value: Number.isFinite(numericDiscountValue) ? numericDiscountValue : 0 }), [items, effectiveDiscountType, numericDiscountValue])
  const canAdd = Boolean(selected && pricing && !pricing.requiresManualPricing && pricing.salePrice !== null && pricing.cost !== null)

  const selectGroup = (groupId: string) => {
    const group = serviceGroups.find((item) => item.id === groupId)
    const groupTypes = [...new Set((group?.services ?? []).map(serviceTypeLabel))]
    setSelectedGroupId(groupId); setSelectedType(groupTypes.length === 1 ? groupTypes[0]! : ''); setSelectedId(''); setQuantity('1'); setPricing(null)
  }
  const selectType = (type: string) => {
    setSelectedType(type); setSelectedId(''); setQuantity('1'); setPricing(null)
  }
  const selectService = (serviceId: string) => {
    const service = services.find((item) => item.id === serviceId)
    setQuantity(service && usesFixedQuantities(service) ? '' : '1')
    setSelectedId(serviceId); setPricing(null)
  }
  const addItem = () => {
    if (!selected || !pricing || !canAdd) return
    setItems((current) => [...current, { key: crypto.randomUUID(), service: selected, quantity: Number(quantity), pricing }])
    setSavedOrder(null); if (!fixedQuantity) setQuantity('1')
  }
  const selectBusinessLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setError('اختر شعارًا بصيغة PNG أو JPG أو WEBP.'); return }
    if (file.size > 2_000_000) { setError('حجم شعار العمل يجب ألا يتجاوز 2 MB.'); return }
    const reader = new FileReader()
    reader.onload = () => { if (typeof reader.result === 'string') { setBusinessLogoDataUrl(reader.result); setError('') } }
    reader.onerror = () => setError('تعذر قراءة ملف الشعار.')
    reader.readAsDataURL(file)
  }
  const cancelDraft = () => {
    if (!window.confirm('هل أنت متأكد من إلغاء الطلب الحالي وحذف مسودته؟')) return
    setItems([]); setCustomerName(''); setCustomerPhone(''); setDeliveryAddress(''); setBusinessLogoDataUrl(null); setNotes(''); setCustomerPanelOpen(false)
    setDiscountType('FIXED'); setDiscountValue(''); setSelectedGroupId(''); setSelectedType(''); setSelectedId(''); setQuantity('1'); setPricing(null); setSavedOrder(null); setError('')
    window.localStorage.removeItem(DRAFT_STORAGE_KEY)
  }
  const saveOrder = async () => {
    if (items.length === 0) return
    setSaving(true); setError(''); setSavedOrder(null)
    try {
      const result = await window.desktopApi.orders.create({
        items: items.map((item) => ({ serviceId: item.service.id, quantity: item.quantity })),
        discountType: effectiveDiscountType,
        discountValue: effectiveDiscountType === 'NONE' ? 0 : numericDiscountValue,
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        deliveryAddress: deliveryAddress.trim() || null,
        businessLogoDataUrl,
        notes: notes.trim() || null
      })
      setSavedOrder(result); setItems([]); setCustomerName(''); setCustomerPhone(''); setDeliveryAddress(''); setBusinessLogoDataUrl(null); setNotes(''); setCustomerPanelOpen(false); setDiscountType('FIXED'); setDiscountValue(''); window.localStorage.removeItem(DRAFT_STORAGE_KEY)
      window.dispatchEvent(new Event('sandala:orders-changed'))
      window.dispatchEvent(new Event('sandala:inventory-changed'))
    } catch (cause) { setError(getArabicError(cause, 'تعذر تأكيد الطلب. حاول مرة أخرى.')) } finally { setSaving(false) }
  }

  return <div className="page new-order-page">
    <PageHeader title="طلب جديد" subtitle={`التاريخ والوقت: ${new Intl.DateTimeFormat(ARABIC_WITH_LATIN_DIGITS, { dateStyle: 'short', timeStyle: 'short' }).format(new Date())}`} action={<button type="button" className="cancel-draft-button" disabled={items.length === 0 && !customerName && !customerPhone && !deliveryAddress && !notes && !businessLogoDataUrl && !discountValue} onClick={cancelDraft}><Trash2 size={17} /> إلغاء الطلب</button>} />
    {error && <div className="alert error">{error}</div>}
    {savedOrder && <div className="alert success-alert"><CheckCircle2 size={20} /><div><b>تم تأكيد الطلب وخصم المخزون</b><span>{savedOrder.orderNumber} • {savedOrder.customerName} • الإجمالي {formatCurrency(savedOrder.total)}</span></div></div>}
    <div className="order-layout">
      <div className="order-main-column">
        <section className={`panel order-customer-panel${customerPanelOpen ? ' open' : ' collapsed'}`}>
          <button type="button" className="customer-panel-toggle" aria-expanded={customerPanelOpen} onClick={() => setCustomerPanelOpen((current) => !current)}><UserRound size={20} /><div><h2>بيانات الزبون والتوصيل</h2><p>{customerPanelOpen ? 'جميع الحقول اختيارية، واتركها فارغة لتسجيل زبون عام.' : customerName || customerPhone || deliveryAddress || businessLogoDataUrl || notes ? 'توجد بيانات مدخلة — اضغط لعرضها أو تعديلها' : 'اختياري — اضغط لإضافة الاسم والهاتف والعنوان'}</p></div><span>{customerPanelOpen ? 'إغلاق' : 'فتح'}</span>{customerPanelOpen ? <ChevronUp size={19} /> : <ChevronDown size={19} />}</button>
          {customerPanelOpen && <div className="order-customer-grid">
            <label>اسم الزبون<input name="customerName" value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="زبون عام" /></label>
            <label>رقم الهاتف<input name="customerPhone" type="tel" dir="ltr" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="05xxxxxxxx" /></label>
            <label>عنوان التوصيل<input name="deliveryAddress" value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} placeholder="المدينة، الشارع، تفاصيل العنوان" /></label>
            <label>ملاحظات الطلب<input name="orderNotes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="ملاحظات اختيارية..." /></label>
            <div className="customer-logo-field"><span>شعار العمل</span>{businessLogoDataUrl ? <div className="customer-logo-preview"><img src={businessLogoDataUrl} alt="شعار العمل" /><button type="button" onClick={() => setBusinessLogoDataUrl(null)} title="حذف الشعار"><Trash2 size={15} /></button></div> : <label className="customer-logo-upload"><ImagePlus size={17} /> إضافة شعار<input type="file" accept="image/png,image/jpeg,image/webp" onChange={selectBusinessLogo} /></label>}</div>
          </div>}
        </section>

        <section className="panel service-composer">
          <div className="section-title"><div><h2>اختيار الخدمة والكمية</h2><p>اختر الفئة، ثم الصنف أو الحجم، ثم الخدمة المطلوبة</p></div><Plus size={22} /></div>
          {loading ? <div className="table-state"><LoaderCircle className="spin" size={27} /> جارٍ تحميل الخدمات...</div> : services.length === 0 ? <div className="table-state">لا توجد خدمات نشطة.</div> : <div className="composer-body">
            <div className="service-hierarchy-grid">
              <label><span><b>1</b> الفئة</span><select name="serviceCategory" value={selectedGroupId} onChange={(event) => selectGroup(event.target.value)}><option value="" disabled hidden>اختر الفئة</option>{serviceGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
              <label><span><b>2</b> الصنف / الحجم</span><select name="serviceType" value={effectiveSelectedType} disabled={!selectedGroup} onChange={(event) => selectType(event.target.value)}><option value="" disabled hidden>{selectedGroup ? 'اختر الصنف أو الحجم' : 'اختر الفئة أولاً'}</option>{typeOptions.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
              <label><span><b>3</b> المنتج / الخدمة</span><select name="serviceProduct" value={selectedId} disabled={!effectiveSelectedType} onChange={(event) => selectService(event.target.value)}><option value="" disabled hidden>{effectiveSelectedType ? 'اختر المنتج أو الخدمة' : 'اختر الصنف أولاً'}</option>{servicesForType.map((service) => <option key={service.id} value={service.id}>{service.nameAr}</option>)}</select></label>
              <label><span><b>4</b> الكمية</span>{fixedQuantity ? <select name="serviceQuantity" value={quantity} disabled={rulesLoading || quantityOptions.length === 0} onChange={(event) => setQuantity(event.target.value)}><option value="" disabled hidden>{rulesLoading ? 'جارٍ التحميل...' : 'اختر الكمية'}</option>{quantityOptions.map((value) => <option key={value} value={value}>{formatNumber(value)}</option>)}</select> : <input name="serviceQuantity" type="number" min="1" step="1" disabled={!selected} value={quantity} onChange={(event) => setQuantity(event.target.value)} />}</label>
            </div>
            {selected && fixedQuantity && <div className="fixed-quantity-note">هذه الخدمة تُباع بكميات محددة؛ اختر الكمية من القائمة.</div>}
            <div className={`automatic-price-area${selected ? '' : ' hidden'}`}>
              {pricingLoading ? <div className="automatic-price-loading"><LoaderCircle className="spin" size={23} /> جارٍ حساب السعر...</div> : pricing?.requiresManualPricing ? <div className="automatic-price-warning"><AlertTriangle size={23} /><div><b>لا يوجد سعر محدد لهذه الكمية</b><span>اختر كمية لها قاعدة سعر أو أضف القاعدة من صفحة الأسعار.</span></div></div> : pricing && <div className="automatic-price-result sale-only"><div><span>سعر البيع</span><b>{formatCurrency(pricing.salePrice ?? 0, 4)}</b></div></div>}
            </div>
            {selected && <button className="primary-button add-service-button" disabled={!canAdd} onClick={addItem}><Plus size={18} /> إضافة الخدمة إلى الطلب</button>}
          </div>}
        </section>

        <section className="panel order-items-panel">
          <div className="section-title"><div><h2>خدمات الطلب</h2><p>{items.length} خدمة مضافة</p></div><button type="button" className="order-financials-toggle" onClick={() => setShowInternalDetails((current) => !current)}>{showInternalDetails ? <EyeOff size={17} /> : <Eye size={17} />}{showInternalDetails ? 'إخفاء التكلفة والربح' : 'إظهار التكلفة والربح'}</button></div>
          {items.length === 0 ? <div className="empty-state order-empty"><ShoppingCart size={37} /><b>لم تتم إضافة خدمات بعد</b><span>اختر خدمة وكمية، وسيظهر سعرها تلقائيًا قبل الإضافة.</span></div> : <div className="table-scroll"><table className={`data-table order-items-table${showInternalDetails ? ' financials-visible' : ''}`}><thead><tr><th>الخدمة</th><th>الكمية</th><th>سعر البيع</th>{showInternalDetails && <><th>التكلفة</th><th>الربح</th></>}<th></th></tr></thead><tbody>{items.map((item) => <tr key={item.key}><td><b>{item.service.nameAr}</b><small>{item.service.categoryName}</small></td><td>{formatNumber(item.quantity)}</td><td>{formatCurrency(item.pricing.salePrice ?? 0, 4)}</td>{showInternalDetails && <><td>{formatCurrency(item.pricing.cost ?? 0, 4)}</td><td className={(item.pricing.profit ?? 0) < 0 ? 'negative' : 'positive'}>{formatCurrency(item.pricing.profit ?? 0, 4)}</td></>}<td><button className="remove-item-button" onClick={() => setItems((current) => current.filter((row) => row.key !== item.key))} title="حذف"><Trash2 size={17} /></button></td></tr>)}</tbody></table></div>}
        </section>
      </div>

      <aside className="panel order-summary live-summary"><h2>إجمالي الطلب</h2><div className="summary-row"><span>عدد الخدمات</span><b>{formatNumber(items.length)}</b></div><section className="manager-discount-card"><div className="manager-discount-heading"><b>خصم المدير</b><button type="button" onClick={() => { setDiscountType('PERCENT'); setDiscountValue('20') }}>خصم الطلاب 20%</button></div><div className="discount-mode-switch"><button type="button" className={discountType === 'FIXED' ? 'active' : ''} onClick={() => setDiscountType('FIXED')}>قيمة بالشواقل</button><button type="button" className={discountType === 'PERCENT' ? 'active' : ''} onClick={() => setDiscountType('PERCENT')}>نسبة مئوية</button></div><label><span>{discountType === 'FIXED' ? 'قيمة الخصم' : 'نسبة الخصم'}</span><div><input type="number" min="0" max={discountType === 'PERCENT' ? 100 : undefined} step="0.01" value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} placeholder="0" /><b>{discountType === 'FIXED' ? '₪' : '%'}</b></div></label></section><div className="summary-row"><span>قبل الخصم</span><b>{formatCurrency(totals.subtotal)}</b></div><div className="summary-row discount-total-row"><span>الخصم</span><b>- {formatCurrency(totals.discountAmount)}</b></div><div className="summary-row final-order-total"><span>السعر النهائي</span><b>{formatCurrency(totals.total)}</b></div><button className="primary-button full save-order-button" disabled={items.length === 0 || saving} onClick={() => void saveOrder()}>{saving ? <><LoaderCircle className="spin" size={18} /> جارٍ التأكيد...</> : 'تأكيد الطلب'}</button><small>تُحفظ المسودة تلقائيًا عند الانتقال بين الصفحات. يُخصم المخزون عند التأكيد، وتُحتسب المبيعات والأرباح بعد تسجيل الدفع.</small></aside>
    </div>
  </div>
}
