import { useState, type FormEvent } from 'react'
import type { PricingRuleInput } from '../../../shared/contracts'
import type { PriceRule } from '../../../shared/pricing/pricing-types'
import { Modal } from './Modal'
import { getArabicError } from '../utils/errors'

const rangeRule = (serviceId: string): PricingRuleInput => ({ serviceId, ruleType: 'UNIT_PRICE', exactQuantity: null, minQuantity: 1, maxQuantity: null, fixedPrice: null, unitPrice: null, priority: 10, active: true })
const fixedRule = (serviceId: string): PricingRuleInput => ({ serviceId, ruleType: 'EXACT_QUANTITY', exactQuantity: null, minQuantity: null, maxQuantity: null, fixedPrice: null, unitPrice: null, priority: 10, active: true })

export function RuleDialog({ serviceId, rule, fixedQuantity, onClose, onSaved }: { serviceId: string; rule?: PriceRule; fixedQuantity: boolean; onClose: () => void; onSaved: (rule: PriceRule) => void }) {
  const [form, setForm] = useState<PricingRuleInput>(() => rule ? { ...rule } : fixedQuantity ? fixedRule(serviceId) : rangeRule(serviceId))
  const [unitPriceText, setUnitPriceText] = useState(() => rule?.unitPrice === null || rule?.unitPrice === undefined ? '' : String(rule.unitPrice))
  const [rangeMode, setRangeMode] = useState<'RANGE' | 'OPEN_ENDED'>(() => rule && rule.maxQuantity === null ? 'OPEN_ENDED' : 'RANGE')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const number = (value: string) => value === '' ? null : Number(value)
  const exactMode = fixedQuantity || form.exactQuantity !== null || form.ruleType === 'EXACT_QUANTITY' || form.ruleType === 'BULK_PRICE'
  const legacyRule = Boolean(rule && !exactMode && rule.ruleType !== 'UNIT_PRICE')
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('')
    let submittedForm = form
    if (!exactMode && !(legacyRule && form.fixedPrice !== null)) {
      const parsedUnitPrice = Number(unitPriceText.replace(',', '.'))
      if (unitPriceText.trim() === '' || !Number.isFinite(parsedUnitPrice) || parsedUnitPrice < 0) {
        setError('اكتب سعر وحدة صالحًا باستخدام الأرقام، مثل 0.4.')
        return
      }
      submittedForm = { ...form, unitPrice: parsedUnitPrice, fixedPrice: null }
    }
    setSaving(true)
    const normalizedForm = exactMode ? submittedForm : { ...submittedForm, ruleType: rangeMode === 'OPEN_ENDED' ? 'MIN_QUANTITY' as const : 'UNIT_PRICE' as const, maxQuantity: rangeMode === 'OPEN_ENDED' ? null : submittedForm.maxQuantity }
    try { onSaved(await window.desktopApi.pricing.saveRule(normalizedForm)) }
    catch (cause) { setError(getArabicError(cause, 'تعذر حفظ قاعدة السعر. تأكد أن النطاق لا يتداخل مع قاعدة أخرى.')) }
    finally { setSaving(false) }
  }

  return <Modal title={rule ? 'تعديل قاعدة السعر' : 'إضافة شريحة سعر'} onClose={onClose}>
    <form className="dialog-form one-column pricing-range-form" onSubmit={submit}>
      {error && <div className="alert error">{error}</div>}
      {exactMode ? <>
        <div className="pricing-form-note"><b>كمية محددة</b><span>استخدم هذا النوع للمنتجات التي تُباع بكميات جاهزة ومحددة.</span></div>
        <label>الكمية<input type="number" min="1" step="1" required value={form.exactQuantity ?? ''} onChange={(event) => setForm({ ...form, exactQuantity: number(event.target.value) })} /></label>
        <label>السعر الإجمالي لهذه الكمية<input type="number" min="0" step="0.001" required value={form.fixedPrice ?? ''} onChange={(event) => setForm({ ...form, fixedPrice: number(event.target.value), unitPrice: null })} /></label>
      </> : <>
        <div className="pricing-form-note"><b>{rangeMode === 'RANGE' ? 'شريحة كمية من — إلى' : 'شريحة كمية فأكثر'}</b><span>{rangeMode === 'RANGE' ? 'مثال: من 1 إلى 10 بسعر 0.4 ₪ للوحدة، ثم من 11 إلى 20 بسعر 0.3 ₪.' : 'مثال: 100 أو أكثر بسعر 0.2 ₪ للوحدة.'}</span></div>
        <div className="range-mode-switch pricing-rule-mode"><button type="button" className={rangeMode === 'RANGE' ? 'active' : ''} onClick={() => { setRangeMode('RANGE'); setForm({ ...form, ruleType: 'UNIT_PRICE' }) }}>من — إلى</button><button type="button" className={rangeMode === 'OPEN_ENDED' ? 'active' : ''} onClick={() => { setRangeMode('OPEN_ENDED'); setForm({ ...form, ruleType: 'MIN_QUANTITY', maxQuantity: null }) }}>رقم فأكثر</button></div>
        <div className={`quantity-range-fields${rangeMode === 'OPEN_ENDED' ? ' open-ended' : ''}`}><label>{rangeMode === 'RANGE' ? 'من كمية' : 'ابتداءً من كمية'}<input type="number" inputMode="numeric" min="1" step="1" required value={form.minQuantity ?? ''} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setForm({ ...form, minQuantity: number(event.target.value) })} /></label>{rangeMode === 'RANGE' && <label>إلى كمية<input type="number" inputMode="numeric" min={form.minQuantity ?? 1} step="1" required value={form.maxQuantity ?? ''} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setForm({ ...form, maxQuantity: number(event.target.value) })} /></label>}</div>
        {legacyRule && form.fixedPrice !== null ? <label>السعر الإجمالي للشريحة<input type="number" min="0" step="0.001" required value={form.fixedPrice} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setForm({ ...form, fixedPrice: number(event.target.value), unitPrice: null })} /><small>هذه قاعدة قديمة بسعر إجمالي. يمكنك حذفها وإضافة شريحة جديدة لاستخدام سعر الوحدة.</small></label> : <label>سعر الوحدة داخل هذه الشريحة<input type="text" inputMode="decimal" dir="ltr" autoComplete="off" required value={unitPriceText} onFocus={(event) => event.currentTarget.select()} onChange={(event) => { const value = event.target.value; if (/^\d*(?:[.,]\d*)?$/.test(value)) setUnitPriceText(value) }} placeholder="مثال: 0.4" /></label>}
      </>}
      <label className="checkbox-label"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> الشريحة نشطة</label>
      <div className="dialog-actions"><button type="button" className="secondary-button" onClick={onClose}>إلغاء</button><button className="primary-button" disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ الشريحة'}</button></div>
    </form>
  </Modal>
}
