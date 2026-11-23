import { formatOrderTotal } from '../utils/format'
import { useConfirm } from '../components/ConfirmationProvider'
import { Modal } from '../components/Modal'
import { AlertTriangle, ArrowRight, BadgePercent, CheckCircle2, Eye, EyeOff, ImagePlus, LayoutGrid, LoaderCircle, Minus, Package, Plus, Search, ShoppingCart, Tag, Trash2, UserRound, Wrench, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import type { CatalogItemType, CreateOrderResult, ServiceCategoryDto, ServiceDto } from '../../../shared/contracts'
import { calculateDraftTotals, type OrderDiscountType } from '../../../shared/orders/order-draft'
import { usesFixedQuantities, type PricingResult } from '../../../shared/pricing/pricing-types'
import { ARABIC_WITH_LATIN_DIGITS, formatCurrency, formatNumber } from '../utils/format'
import { catalogBranches } from '../../../shared/catalog-hierarchy'
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
interface QuantityPick { service: ServiceDto; options: Array<{ quantity: number; pricing: PricingResult | null }>; loading: boolean }

const DRAFT_STORAGE_KEY = 'sandala:new-order-draft:v1'
const STUDENT_DISCOUNT_PERCENT = 20
const TILE_TONES = ['blue', 'teal', 'violet', 'amber', 'rose', 'green', 'indigo', 'orange']
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

function isPriced(pricing: PricingResult | null | undefined): pricing is PricingResult {
  return Boolean(pricing && !pricing.requiresManualPricing && pricing.salePrice !== null && pricing.cost !== null && pricing.profit !== null && pricing.profitMargin !== null)
}

export function NewOrderPage() {
  const confirm = useConfirm()
  const [restoredDraft] = useState(readStoredDraft)
  const [services, setServices] = useState<ServiceDto[]>([])
  const [categories, setCategories] = useState<ServiceCategoryDto[]>([])
  const [catalogType, setCatalogType] = useState<CatalogItemType>('PRODUCT')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [secondaryId, setSecondaryId] = useState('')
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<DraftItem[]>(restoredDraft.items)
  const [pendingQuantities, setPendingQuantities] = useState<Record<string, number>>({})
  const [quantityOptionsByService, setQuantityOptionsByService] = useState<Record<string, number[]>>({})
  const [addingId, setAddingId] = useState('')
  const [quantityPick, setQuantityPick] = useState<QuantityPick | null>(null)
  const [customerName, setCustomerName] = useState(restoredDraft.customerName)
  const [customerPhone, setCustomerPhone] = useState(restoredDraft.customerPhone)
  const [deliveryAddress, setDeliveryAddress] = useState(restoredDraft.deliveryAddress)
  const [businessLogoDataUrl, setBusinessLogoDataUrl] = useState<string | null>(restoredDraft.businessLogoDataUrl)
  const [notes, setNotes] = useState(restoredDraft.notes)
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false)
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false)
  const [showInternalDetails, setShowInternalDetails] = useState(false)
  const [discountType, setDiscountType] = useState<Exclude<OrderDiscountType, 'NONE'>>(restoredDraft.discountType)
  const [discountValue, setDiscountValue] = useState(restoredDraft.discountValue)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedOrder, setSavedOrder] = useState<CreateOrderResult | null>(null)
  const restoredPricesRefreshed = useRef(false)
  const itemsRef = useRef(items)
  const requestTokens = useRef<Record<string, number>>({})
  const searchRef = useRef<HTMLInputElement>(null)
  itemsRef.current = items

  useEffect(() => {
    Promise.all([window.desktopApi.catalog.listServices(), window.desktopApi.catalog.listCategories()]).then(([rows, groups]) => {
      setCategories(groups)
      const active = rows.filter((service) => service.active)
      setServices(active)
      if (!active.some((service) => service.itemType === 'PRODUCT') && active.some((service) => service.itemType === 'SERVICE')) setCatalogType('SERVICE')
    }).catch((cause) => setError(getArabicError(cause, 'تعذر تحميل الخدمات.'))).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const draft: StoredOrderDraft = { items, customerName, customerPhone, deliveryAddress, businessLogoDataUrl, notes, customerPanelOpen: false, discountType, discountValue }
    const hasContent = items.length > 0 || Boolean(customerName || customerPhone || deliveryAddress || businessLogoDataUrl || notes || Number(discountValue) > 0)
    try {
      if (hasContent) window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
      else window.localStorage.removeItem(DRAFT_STORAGE_KEY)
    } catch { /* تعذر الحفظ محلياً، ولا يجب تعطيل إنشاء الطلب. */ }
  }, [items, customerName, customerPhone, deliveryAddress, businessLogoDataUrl, notes, discountType, discountValue])

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

  // F2 يركّز على البحث مثل أنظمة الكاشير
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'F2') { event.preventDefault(); searchRef.current?.focus() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const branches = useMemo(() => catalogBranches(categories, services, catalogType), [categories, services, catalogType])
  const typeCounts = useMemo(() => ({ PRODUCT: services.filter((s) => s.itemType === 'PRODUCT').length, SERVICE: services.filter((s) => s.itemType === 'SERVICE').length }), [services])
  const selectedGroup = branches.find((branch) => branch.id === selectedGroupId)
  const searchTerm = search.trim().toLowerCase()
  const visibleProducts = useMemo(() => {
    if (searchTerm) return services.filter((service) => [service.nameAr, service.nameHe ?? '', service.code, service.categoryName].some((value) => value.toLowerCase().includes(searchTerm)))
    if (!selectedGroup) return []
    if (secondaryId) return selectedGroup.children.find((child) => child.id === secondaryId)?.items ?? []
    return selectedGroup.children.flatMap((child) => child.items)
  }, [searchTerm, services, selectedGroup, secondaryId])
  const quantityInCart = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of items) map.set(item.service.id, (map.get(item.service.id) ?? 0) + 1)
    return map
  }, [items])

  // ===== منطق الخصم والإجماليات (بدون تغيير على القواعد الحالية) =====
  const subtotalBeforeDiscount = useMemo(() => calculateDraftTotals(items.map((item) => ({ salePrice: item.pricing.salePrice ?? 0, cost: item.pricing.cost ?? 0 }))).subtotal, [items])
  const maximumFixedDiscount = Math.floor(subtotalBeforeDiscount * 0.1)
  const parsedDiscountValue = Number(discountValue)
  const numericDiscountValue = discountType === 'PERCENT' ? Math.min(parsedDiscountValue, 100) : Math.min(Math.trunc(parsedDiscountValue), maximumFixedDiscount)
  const effectiveDiscountType: OrderDiscountType = Number.isFinite(numericDiscountValue) && numericDiscountValue > 0 ? discountType : 'NONE'
  const totals = useMemo(() => calculateDraftTotals(items.map((item) => ({ salePrice: item.pricing.salePrice ?? 0, cost: item.pricing.cost ?? 0 })), { type: effectiveDiscountType, value: Number.isFinite(numericDiscountValue) ? numericDiscountValue : 0 }), [items, effectiveDiscountType, numericDiscountValue])
  const studentDiscountActive = effectiveDiscountType === 'PERCENT' && numericDiscountValue === STUDENT_DISCOUNT_PERCENT
  const customDiscountActive = effectiveDiscountType !== 'NONE' && !studentDiscountActive
  const totalQuantity = items.reduce((sum, item) => sum + (pendingQuantities[item.key] ?? item.quantity), 0)
  const hasPending = Object.keys(pendingQuantities).length > 0 || Boolean(addingId)
  const hasCustomerData = Boolean(customerName || customerPhone || deliveryAddress || businessLogoDataUrl || notes)
  const hasDraft = items.length > 0 || hasCustomerData || Boolean(discountValue)

  const clampDiscount = (type: Exclude<OrderDiscountType, 'NONE'>, value: string): string => {
    if (value === '') return ''
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) return ''
    const limited = type === 'FIXED' ? Math.min(Math.max(0, Math.trunc(numericValue)), maximumFixedDiscount) : Math.min(Math.max(0, numericValue), 100)
    return String(limited)
  }
  const toggleStudentDiscount = () => {
    if (studentDiscountActive) { setDiscountValue(''); setDiscountType('FIXED'); return }
    setDiscountType('PERCENT'); setDiscountValue(String(STUDENT_DISCOUNT_PERCENT))
  }
  const clearDiscount = () => { setDiscountType('FIXED'); setDiscountValue('') }

  // ===== السلة =====
  const loadQuantityOptions = async (service: ServiceDto): Promise<number[]> => {
    const cached = quantityOptionsByService[service.id]
    if (cached) return cached
    const rules = await window.desktopApi.pricing.listRules(service.id)
    const options = [...new Set(rules.filter((rule) => rule.active).map((rule) => rule.exactQuantity).filter((value): value is number => value !== null))].sort((a, b) => a - b)
    setQuantityOptionsByService((current) => ({ ...current, [service.id]: options }))
    return options
  }

  const priceFor = async (service: ServiceDto, quantity: number): Promise<PricingResult> => {
    const result = await window.desktopApi.pricing.calculate(service.id, quantity)
    if (result.requiresManualPricing || result.salePrice === null) throw new Error(`لا يوجد سعر محدد لـ «${service.nameAr}» بالكمية ${formatNumber(quantity)}. أضف قاعدة السعر من صفحة الأسعار.`)
    if (!isPriced(result)) throw new Error(`تكلفة «${service.nameAr}» غير محددة. حدّث التكلفة من صفحة الخدمات أولًا.`)
    return result
  }

  const setLineQuantity = (key: string, quantity: number) => {
    const line = itemsRef.current.find((item) => item.key === key)
    if (!line || !Number.isFinite(quantity) || quantity <= 0) return
    const token = (requestTokens.current[key] ?? 0) + 1
    requestTokens.current[key] = token
    setPendingQuantities((current) => ({ ...current, [key]: quantity }))
    setError('')
    priceFor(line.service, quantity).then((pricing) => {
      if (requestTokens.current[key] !== token) return
      setItems((current) => current.map((item) => item.key === key ? { ...item, quantity, pricing } : item))
    }).catch((cause) => {
      if (requestTokens.current[key] === token) setError(getArabicError(cause, 'تعذر حساب السعر للكمية الجديدة.'))
    }).finally(() => {
      if (requestTokens.current[key] !== token) return
      setPendingQuantities((current) => { const next = { ...current }; delete next[key]; return next })
    })
  }

  const stepLine = async (item: DraftItem, direction: 1 | -1) => {
    const current = pendingQuantities[item.key] ?? item.quantity
    if (usesFixedQuantities(item.service)) {
      try {
        const options = await loadQuantityOptions(item.service)
        const index = options.indexOf(current)
        const next = options[(index === -1 ? 0 : index) + direction]
        if (next !== undefined) setLineQuantity(item.key, next)
      } catch (cause) { setError(getArabicError(cause, 'تعذر تحميل كميات الخدمة.')) }
      return
    }
    if (current + direction >= 1) setLineQuantity(item.key, current + direction)
  }

  const removeLine = (key: string) => {
    requestTokens.current[key] = (requestTokens.current[key] ?? 0) + 1
    setPendingQuantities((current) => { const next = { ...current }; delete next[key]; return next })
    setItems((current) => current.filter((item) => item.key !== key))
  }

  const addLine = (service: ServiceDto, quantity: number, pricing: PricingResult) => {
    setItems((current) => [...current, { key: crypto.randomUUID(), service, quantity, pricing }])
    setSavedOrder(null)
  }

  const pickProduct = async (service: ServiceDto) => {
    if (addingId) return
    setError(''); setSavedOrder(null)
    if (usesFixedQuantities(service)) {
      setQuantityPick({ service, options: [], loading: true })
      try {
        const options = await loadQuantityOptions(service)
        const priced = await Promise.all(options.map(async (quantity) => {
          try { const pricing = await window.desktopApi.pricing.calculate(service.id, quantity); return { quantity, pricing: isPriced(pricing) ? pricing : null } }
          catch { return { quantity, pricing: null } }
        }))
        setQuantityPick((current) => current?.service.id === service.id ? { service, options: priced, loading: false } : current)
      } catch (cause) { setQuantityPick(null); setError(getArabicError(cause, 'تعذر تحميل كميات الخدمة.')) }
      return
    }
    const existing = itemsRef.current.find((item) => item.service.id === service.id)
    if (existing) { setLineQuantity(existing.key, (pendingQuantities[existing.key] ?? existing.quantity) + 1); return }
    setAddingId(service.id)
    try { addLine(service, 1, await priceFor(service, 1)) }
    catch (cause) { setError(getArabicError(cause, 'تعذر حساب سعر الخدمة.')) }
    finally { setAddingId('') }
  }

  const chooseType = (type: CatalogItemType) => { setCatalogType(type); setSelectedGroupId(''); setSecondaryId(''); setSearch('') }
  const openGroup = (groupId: string) => { setSelectedGroupId(groupId); setSecondaryId('') }

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
  const resetDraft = () => {
    requestTokens.current = {}
    setItems([]); setPendingQuantities({}); setCustomerName(''); setCustomerPhone(''); setDeliveryAddress(''); setBusinessLogoDataUrl(null); setNotes('')
    setDiscountType('FIXED'); setDiscountValue('')
    window.localStorage.removeItem(DRAFT_STORAGE_KEY)
  }
  const cancelDraft = async () => {
    if (!await confirm('هل أنت متأكد من إلغاء الطلب الحالي وحذف مسودته؟')) return
    resetDraft(); setSelectedGroupId(''); setSecondaryId(''); setSearch(''); setSavedOrder(null); setError('')
  }
  const saveOrder = async () => {
    if (items.length === 0 || hasPending) return
    setSaving(true); setError(''); setSavedOrder(null)
    try {
      const refreshedItems = await Promise.all(items.map(async (item) => {
        const currentService = services.find((service) => service.id === item.service.id)
        if (!currentService) throw new Error(`الخدمة «${item.service.nameAr}» لم تعد موجودة. احذفها من الطلب واختر خدمة أخرى.`)
        const currentPricing = await window.desktopApi.pricing.calculate(currentService.id, item.quantity)
        if (currentPricing.requiresManualPricing || currentPricing.salePrice === null) throw new Error(`لا توجد قاعدة سعر صالحة لخدمة «${currentService.nameAr}» والكمية المختارة.`)
        if (currentPricing.cost === null || currentPricing.profit === null || currentPricing.profitMargin === null) throw new Error(`تكلفة خدمة «${currentService.nameAr}» غير محددة. حدّث التكلفة من صفحة الخدمات أولًا.`)
        return { ...item, service: currentService, pricing: currentPricing }
      }))
      setItems(refreshedItems)
      const refreshedSubtotal = calculateDraftTotals(refreshedItems.map((item) => ({ salePrice: item.pricing.salePrice ?? 0, cost: item.pricing.cost ?? 0 }))).subtotal
      const refreshedFixedMaximum = Math.floor(refreshedSubtotal * 0.1)
      const submittedDiscountValue = effectiveDiscountType === 'FIXED' ? Math.min(numericDiscountValue, refreshedFixedMaximum) : numericDiscountValue
      const submittedDiscountType: OrderDiscountType = submittedDiscountValue > 0 ? effectiveDiscountType : 'NONE'
      const result = await window.desktopApi.orders.create({
        items: refreshedItems.map((item) => ({ serviceId: item.service.id, quantity: item.quantity })),
        discountType: submittedDiscountType,
        discountValue: submittedDiscountType === 'NONE' ? 0 : submittedDiscountValue,
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        deliveryAddress: deliveryAddress.trim() || null,
        businessLogoDataUrl,
        notes: notes.trim() || null
      })
      setSavedOrder(result); resetDraft()
      window.dispatchEvent(new Event('sandala:orders-changed'))
    } catch (cause) { setError(getArabicError(cause, 'تعذر تأكيد الطلب. حاول مرة أخرى.')) } finally { setSaving(false) }
  }

  const now = new Intl.DateTimeFormat(ARABIC_WITH_LATIN_DIGITS, { dateStyle: 'short', timeStyle: 'short' }).format(new Date())

  return <div className="page pos-page">
    <div className="pos-layout">
      {/* ===== الكتالوج ===== */}
      <section className="pos-catalog">
        <header className="pos-toolbar">
          <div className="pos-title"><h1>نقطة البيع</h1><span>{now}</span></div>
          <div className="pos-type-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={catalogType === 'PRODUCT'} className={catalogType === 'PRODUCT' ? 'active' : ''} onClick={() => chooseType('PRODUCT')}><Package size={17} /> المنتجات <small>{typeCounts.PRODUCT}</small></button>
            <button type="button" role="tab" aria-selected={catalogType === 'SERVICE'} className={catalogType === 'SERVICE' ? 'active' : ''} onClick={() => chooseType('SERVICE')}><Wrench size={17} /> الخدمات <small>{typeCounts.SERVICE}</small></button>
          </div>
          <label className="pos-search"><Search size={18} /><input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالاسم أو الكود… (F2)" onKeyDown={(event) => { if (event.key === 'Enter' && visibleProducts.length === 1) { void pickProduct(visibleProducts[0]!); setSearch('') } if (event.key === 'Escape') setSearch('') }} />{search && <button type="button" onClick={() => setSearch('')} aria-label="مسح البحث"><X size={16} /></button>}</label>
        </header>

        {error && <div className="alert error pos-alert"><AlertTriangle size={18} /><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="إغلاق"><X size={15} /></button></div>}
        {savedOrder && <div className="alert success-alert pos-alert"><CheckCircle2 size={20} /><div><b>تم تأكيد الطلب</b><span>{savedOrder.orderNumber} • {savedOrder.customerName} • الإجمالي {formatOrderTotal(savedOrder.total)}</span></div></div>}

        <nav className="pos-breadcrumb">
          {(selectedGroup || searchTerm) && <button type="button" className="pos-back" onClick={() => { setSelectedGroupId(''); setSecondaryId(''); setSearch('') }}><ArrowRight size={17} /> الفئات</button>}
          <span><LayoutGrid size={15} /> {catalogType === 'PRODUCT' ? 'المنتجات' : 'الخدمات'}</span>
          {selectedGroup && !searchTerm && <><i>/</i><b>{selectedGroup.name}</b></>}
          {searchTerm && <><i>/</i><b>نتائج البحث ({visibleProducts.length})</b></>}
        </nav>

        {loading ? <div className="pos-state"><LoaderCircle className="spin" size={30} /> جارٍ تحميل الكتالوج...</div>
          : !searchTerm && !selectedGroup ? (branches.length === 0 ? <div className="pos-state">لا توجد عناصر نشطة في هذا القسم.</div> : <div className="pos-category-grid">
            {branches.map((branch, index) => {
              const count = branch.children.reduce((sum, child) => sum + child.items.length, 0)
              return <button type="button" key={branch.id} className={`pos-category-tile tone-${TILE_TONES[index % TILE_TONES.length]}`} onClick={() => openGroup(branch.id)}>
                <span className="pos-category-icon">{branch.name.trim().charAt(0)}</span>
                <b>{branch.name}</b>
                <small>{formatNumber(count)} {catalogType === 'PRODUCT' ? 'منتج' : 'خدمة'}{branch.children.length > 1 ? ` • ${branch.children.length} فئات فرعية` : ''}</small>
              </button>
            })}
          </div>)
          : <>
            {!searchTerm && selectedGroup && selectedGroup.children.length > 1 && <div className="pos-subcategory-chips">
              <button type="button" className={secondaryId === '' ? 'active' : ''} onClick={() => setSecondaryId('')}>الكل</button>
              {selectedGroup.children.map((child) => <button type="button" key={child.id} className={secondaryId === child.id ? 'active' : ''} onClick={() => setSecondaryId(child.id)}>{child.name} <small>{child.items.length}</small></button>)}
            </div>}
            {visibleProducts.length === 0 ? <div className="pos-state">{searchTerm ? 'لا توجد نتائج مطابقة.' : 'لا توجد عناصر في هذه الفئة.'}</div> : <div className="pos-product-grid">
              {visibleProducts.map((service) => {
                const inCart = quantityInCart.get(service.id)
                const fixed = usesFixedQuantities(service)
                return <button type="button" key={service.id} className={`pos-product-tile${inCart ? ' in-cart' : ''}`} disabled={addingId === service.id} onClick={() => void pickProduct(service)}>
                  {inCart && <span className="pos-in-cart-badge">{inCart}</span>}
                  {addingId === service.id && <span className="pos-tile-loading"><LoaderCircle className="spin" size={22} /></span>}
                  <b>{service.nameAr}</b>
                  {service.nameHe && <small className="pos-he" dir="rtl">{service.nameHe}</small>}
                  <span className="pos-product-meta">{service.categoryName}</span>
                  <span className="pos-product-foot">{fixed ? <em>كميات محددة</em> : <em>{service.unit}</em>}<Plus size={16} /></span>
                </button>
              })}
            </div>}
          </>}
      </section>

      {/* ===== شاشة المشتريات ===== */}
      <aside className="pos-cart">
        <header className="pos-cart-header">
          <div><h2><ShoppingCart size={20} /> المشتريات</h2><span>{formatNumber(items.length)} بنود • {formatNumber(totalQuantity)} قطعة</span></div>
          <div className="pos-cart-actions">
            <button type="button" className={`pos-icon-button${showInternalDetails ? ' active' : ''}`} onClick={() => setShowInternalDetails((current) => !current)} title={showInternalDetails ? 'إخفاء التكلفة والربح' : 'إظهار التكلفة والربح'}>{showInternalDetails ? <EyeOff size={17} /> : <Eye size={17} />}</button>
            <button type="button" className="pos-icon-button danger" disabled={!hasDraft} onClick={() => void cancelDraft()} title="إلغاء الطلب"><Trash2 size={17} /></button>
          </div>
        </header>

        <button type="button" className={`pos-customer-button${hasCustomerData ? ' filled' : ''}`} onClick={() => setCustomerDialogOpen(true)}>
          <UserRound size={18} />
          <span><b>{customerName || 'زبون عام'}</b><small>{customerPhone || deliveryAddress || notes ? [customerPhone, deliveryAddress].filter(Boolean).join(' • ') || 'توجد ملاحظات' : 'اضغط لإضافة بيانات الزبون والتوصيل'}</small></span>
          {businessLogoDataUrl && <img src={businessLogoDataUrl} alt="" />}
        </button>

        <div className="pos-lines">
          {items.length === 0 ? <div className="pos-empty"><ShoppingCart size={40} /><b>السلة فارغة</b><span>اختر فئة ثم اضغط على المنتج لإضافته.</span></div>
            : items.map((item) => {
              const pending = pendingQuantities[item.key]
              const displayQuantity = pending ?? item.quantity
              const fixed = usesFixedQuantities(item.service)
              const options = quantityOptionsByService[item.service.id]
              const unitPrice = item.quantity > 0 ? (item.pricing.salePrice ?? 0) / item.quantity : 0
              return <article key={item.key} className={`pos-line${pending !== undefined ? ' pending' : ''}`}>
                <div className="pos-line-top">
                  <div className="pos-line-name"><b>{item.service.nameAr}</b><small>{item.service.categoryName} • {formatCurrency(unitPrice, 4)} / {item.service.unit}</small></div>
                  <button type="button" className="pos-line-remove" onClick={() => removeLine(item.key)} title="حذف"><X size={16} /></button>
                </div>
                <div className="pos-line-bottom">
                  <div className="pos-stepper">
                    <button type="button" onClick={() => void stepLine(item, -1)} disabled={!fixed && displayQuantity <= 1} aria-label="إنقاص"><Minus size={15} /></button>
                    {fixed && options ? <select value={displayQuantity} onChange={(event) => setLineQuantity(item.key, Number(event.target.value))}>{options.map((value) => <option key={value} value={value}>{formatNumber(value)}</option>)}</select>
                      : <QuantityInput value={displayQuantity} readOnly={fixed} onCommit={(value) => setLineQuantity(item.key, value)} />}
                    <button type="button" onClick={() => void stepLine(item, 1)} aria-label="زيادة"><Plus size={15} /></button>
                  </div>
                  <div className="pos-line-total">{pending !== undefined ? <LoaderCircle className="spin" size={17} /> : <b>{formatCurrency(item.pricing.salePrice ?? 0, 4)}</b>}</div>
                </div>
                {showInternalDetails && <div className="pos-line-financials"><span>التكلفة <b>{formatCurrency(item.pricing.cost ?? 0, 4)}</b></span><span className={(item.pricing.profit ?? 0) < 0 ? 'negative' : 'positive'}>الربح <b>{formatCurrency(item.pricing.profit ?? 0, 4)}</b></span></div>}
              </article>
            })}
        </div>

        <footer className="pos-checkout">
          <div className="pos-discount-buttons">
            <button type="button" className={studentDiscountActive ? 'active' : ''} disabled={items.length === 0} onClick={toggleStudentDiscount}><BadgePercent size={17} /> خصم {STUDENT_DISCOUNT_PERCENT}%</button>
            <button type="button" className={customDiscountActive ? 'active' : ''} disabled={items.length === 0} onClick={() => setDiscountDialogOpen(true)}><Tag size={17} /> خصم خاص</button>
          </div>
          <div className="pos-totals">
            <div><span>المجموع</span><b>{formatCurrency(totals.subtotal, 4)}</b></div>
            {totals.discountAmount > 0 && <div className="pos-discount-row"><span>الخصم {effectiveDiscountType === 'PERCENT' ? `(${formatNumber(numericDiscountValue)}%)` : '(قيمة)'}<button type="button" onClick={clearDiscount} title="إزالة الخصم"><X size={13} /></button></span><b>- {formatCurrency(totals.discountAmount, 4)}</b></div>}
            {totals.roundingDiscount > 0 && <div className="pos-rounding-row"><span>خصم المنازل العشرية</span><b>- {formatCurrency(totals.roundingDiscount, 4)}</b></div>}
            {showInternalDetails && items.length > 0 && <div className="pos-internal-totals"><span>التكلفة <b>{formatCurrency(totals.totalCost, 2)}</b></span><span className={totals.profit < 0 ? 'negative' : 'positive'}>الربح <b>{formatCurrency(totals.profit, 2)}</b></span><span>الهامش <b>{formatNumber(totals.profitMargin, 0, 1)}%</b></span></div>}
          </div>
          <button type="button" className="pos-pay-button" disabled={items.length === 0 || saving || hasPending} onClick={() => void saveOrder()}>
            {saving ? <><LoaderCircle className="spin" size={20} /> جارٍ التأكيد...</> : <><span>تأكيد الطلب</span><b>{formatOrderTotal(totals.total)}</b></>}
          </button>
          <small className="pos-hint">تُحفظ المسودة تلقائيًا. تُحتسب المبيعات والأرباح بعد تسجيل الدفع.</small>
        </footer>
      </aside>
    </div>

    {quantityPick && <Modal title={`اختر الكمية — ${quantityPick.service.nameAr}`} onClose={() => setQuantityPick(null)}>
      {quantityPick.loading ? <div className="pos-state"><LoaderCircle className="spin" size={26} /> جارٍ تحميل الكميات والأسعار...</div>
        : quantityPick.options.length === 0 ? <div className="pos-state">لا توجد كميات مسعّرة لهذه الخدمة. أضفها من صفحة الأسعار.</div>
          : <div className="pos-quantity-options">{quantityPick.options.map((option) => <button type="button" key={option.quantity} disabled={!option.pricing} onClick={() => { if (option.pricing) { addLine(quantityPick.service, option.quantity, option.pricing); setQuantityPick(null) } }}>
            <b>{formatNumber(option.quantity)}</b><span>{option.pricing ? formatCurrency(option.pricing.salePrice ?? 0, 4) : 'بدون سعر'}</span>
          </button>)}</div>}
    </Modal>}

    {discountDialogOpen && <CustomDiscountDialog initialType={discountType} initialValue={studentDiscountActive ? '' : discountValue} maximumFixed={maximumFixedDiscount} subtotal={totals.subtotal} clamp={clampDiscount}
      onClose={() => setDiscountDialogOpen(false)} onApply={(type, value) => { setDiscountType(type); setDiscountValue(value); setDiscountDialogOpen(false) }} onClear={() => { clearDiscount(); setDiscountDialogOpen(false) }} />}

    {customerDialogOpen && <Modal title="بيانات الزبون والتوصيل" onClose={() => setCustomerDialogOpen(false)}>
      <div className="pos-customer-form">
        <p>جميع الحقول اختيارية، واتركها فارغة لتسجيل زبون عام.</p>
        <label>اسم الزبون<input name="customerName" value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="زبون عام" /></label>
        <label>رقم الهاتف<input name="customerPhone" type="tel" dir="ltr" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="05xxxxxxxx" /></label>
        <label>عنوان التوصيل<input name="deliveryAddress" value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} placeholder="المدينة، الشارع، تفاصيل العنوان" /></label>
        <label>ملاحظات الطلب<input name="orderNotes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="ملاحظات اختيارية..." /></label>
        <div className="customer-logo-field"><span>شعار العمل</span>{businessLogoDataUrl ? <div className="customer-logo-preview"><img src={businessLogoDataUrl} alt="شعار العمل" /><button type="button" onClick={() => setBusinessLogoDataUrl(null)} title="حذف الشعار"><Trash2 size={15} /></button></div> : <label className="customer-logo-upload"><ImagePlus size={17} /> إضافة شعار<input type="file" accept="image/png,image/jpeg,image/webp" onChange={selectBusinessLogo} /></label>}</div>
        <button type="button" className="primary-button full" onClick={() => setCustomerDialogOpen(false)}>حفظ</button>
      </div>
    </Modal>}
  </div>
}

function QuantityInput({ value, readOnly, onCommit }: { value: number; readOnly?: boolean; onCommit: (value: number) => void }) {
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])
  const commit = () => {
    const next = Math.trunc(Number(text))
    if (Number.isFinite(next) && next >= 1 && next !== value) onCommit(next)
    else setText(String(value))
  }
  return <input type="number" min="1" step="1" value={text} readOnly={readOnly} onChange={(event) => setText(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === 'Enter') (event.target as HTMLInputElement).blur() }} onFocus={(event) => event.target.select()} />
}

function CustomDiscountDialog({ initialType, initialValue, maximumFixed, subtotal, clamp, onApply, onClear, onClose }: {
  initialType: Exclude<OrderDiscountType, 'NONE'>; initialValue: string; maximumFixed: number; subtotal: number
  clamp: (type: Exclude<OrderDiscountType, 'NONE'>, value: string) => string
  onApply: (type: Exclude<OrderDiscountType, 'NONE'>, value: string) => void; onClear: () => void; onClose: () => void
}) {
  const [type, setType] = useState(initialType)
  const [value, setValue] = useState(initialValue)
  const preview = calculateDraftTotals([{ salePrice: subtotal, cost: 0 }], { type: Number(value) > 0 ? type : 'NONE', value: Number(value) || 0 })
  return <Modal title="خصم خاص (خصم المدير)" onClose={onClose}>
    <div className="pos-discount-dialog">
      <div className="discount-mode-switch">
        <button type="button" className={type === 'FIXED' ? 'active' : ''} onClick={() => { setType('FIXED'); setValue(clamp('FIXED', value)) }}>قيمة بالشواقل</button>
        <button type="button" className={type === 'PERCENT' ? 'active' : ''} onClick={() => { setType('PERCENT'); setValue(clamp('PERCENT', value)) }}>نسبة مئوية</button>
      </div>
      <label className="pos-discount-input"><span>{type === 'FIXED' ? 'قيمة الخصم' : 'نسبة الخصم'}</span><div><input type="number" min="0" max={type === 'PERCENT' ? 100 : maximumFixed} step={type === 'FIXED' ? 1 : 0.01} value={value} onChange={(event) => setValue(clamp(type, event.target.value))} placeholder="0" onKeyDown={(event) => { if (event.key === 'Enter') onApply(type, value) }} /><b>{type === 'FIXED' ? '₪' : '%'}</b></div></label>
      {type === 'FIXED' && <small>الحد الأعلى 10% من الإجمالي: {formatCurrency(maximumFixed, 0)}</small>}
      {type === 'PERCENT' && <div className="pos-percent-presets">{[5, 10, 15, 25, 30, 50].map((preset) => <button type="button" key={preset} className={Number(value) === preset ? 'active' : ''} onClick={() => setValue(String(preset))}>{preset}%</button>)}</div>}
      <div className="pos-discount-preview"><span>الخصم <b>- {formatCurrency(preview.discountAmount, 4)}</b></span><span>بعد الخصم <b>{formatOrderTotal(preview.total)}</b></span></div>
      <div className="pos-dialog-actions"><button type="button" className="secondary-button" onClick={onClear}>إزالة الخصم</button><button type="button" className="primary-button" onClick={() => onApply(type, value)}>تطبيق الخصم</button></div>
    </div>
  </Modal>
}
