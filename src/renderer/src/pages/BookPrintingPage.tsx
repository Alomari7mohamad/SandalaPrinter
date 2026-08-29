import { BookOpenText, CheckCircle2, Layers3, Printer, RotateCcw, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { createBookletPlan, type BookletDirection, type BookletFace, type BookletSide } from '../../../shared/booklet/booklet-imposition'
import { PageHeader } from '../components/PageHeader'
import { formatNumber } from '../utils/format'

const pageLabel = (page: number | null) => page === null ? 'فارغ' : formatNumber(page)

function PrintedSide({ title, side, tone }: { title: string; side: BookletSide; tone: 'outside' | 'inside' }) {
  return <div className={`booklet-side ${tone}`}>
    <div className="booklet-side-title"><span>{title}</span><small>اتجاه النظر إلى وجه الورقة</small></div>
    <div className="booklet-spread">
      <div className={side.left === null ? 'blank' : ''}><span>اليسار</span><b>{pageLabel(side.left)}</b></div>
      <i aria-hidden="true" />
      <div className={side.right === null ? 'blank' : ''}><span>اليمين</span><b>{pageLabel(side.right)}</b></div>
    </div>
  </div>
}

export function BookPrintingPage() {
  const [pageCount, setPageCount] = useState('8')
  const [signatureSize, setSignatureSize] = useState('0')
  const [pageOneFace, setPageOneFace] = useState<BookletFace>('OUTSIDE')
  const [direction, setDirection] = useState<BookletDirection>('PAGE_ONE_LEFT')
  const [paperSize, setPaperSize] = useState('A4_TO_A5')
  const [coverMode, setCoverMode] = useState('SEPARATE_BLANK_BACK')
  const parsedPages = Number(pageCount)
  const error = !Number.isInteger(parsedPages) || parsedPages < 1 || parsedPages > 2000 ? 'أدخل عددًا صحيحًا من 1 إلى 2000 صفحة.' : ''
  const plan = useMemo(() => error ? null : createBookletPlan(parsedPages, Number(signatureSize) || null, pageOneFace, direction), [parsedPages, signatureSize, pageOneFace, direction, error])
  const finishedSize = paperSize === 'A3_TO_A4' ? 'A4' : paperSize === 'A5_TO_A6' ? 'A6' : 'A5'
  const reset = () => { setPageCount('8'); setSignatureSize('0'); setPageOneFace('OUTSIDE'); setDirection('PAGE_ONE_LEFT'); setPaperSize('A4_TO_A5'); setCoverMode('SEPARATE_BLANK_BACK') }

  return <div className="page booklet-page">
    <PageHeader title="طباعة الكتب" subtitle="ترتيب صفحات الدفاتر والكتب على وجهي الورقة قبل الطباعة والطي" action={<div className="page-header-actions"><button className="secondary-button" onClick={reset}><RotateCcw size={17} /> إعادة الضبط</button><button className="primary-button" disabled={!plan} onClick={() => window.print()}><Printer size={17} /> طباعة المخطط</button></div>} />
    <section className="panel booklet-config no-print">
      <div className="booklet-config-heading"><span><BookOpenText size={22} /></span><div><h2>إعداد الكتاب</h2><p>أدخل عدد صفحات المحتوى فقط؛ الغلاف لا يدخل في العدد.</p></div></div>
      <div className="booklet-config-grid">
        <label><span>عدد الصفحات بدون الغلاف</span><input type="number" min="1" max="2000" step="1" value={pageCount} onChange={(event) => setPageCount(event.target.value)} /></label>
        <label><span>حجم ورقة الطباعة والنتيجة</span><select value={paperSize} onChange={(event) => setPaperSize(event.target.value)}><option value="A4_TO_A5">ورقة A4 ← كتاب A5</option><option value="A3_TO_A4">ورقة A3 ← كتاب A4</option><option value="A5_TO_A6">ورقة A5 ← كتاب A6</option></select></label>
        <label><span>طريقة التجميع</span><select value={signatureSize} onChange={(event) => setSignatureSize(event.target.value)}><option value="0">ملزمة واحدة — كل الكتاب</option><option value="16">ملازم 16 صفحة — موصى بها</option><option value="20">ملازم 20 صفحة</option><option value="24">ملازم 24 صفحة</option><option value="32">ملازم 32 صفحة</option></select></label>
        <label><span>مكان الصفحة الأولى</span><select value={pageOneFace} onChange={(event) => setPageOneFace(event.target.value as BookletFace)}><option value="OUTSIDE">على الوجه الخارجي للورقة</option><option value="INSIDE">على الوجه الداخلي للورقة</option></select></label>
        <label><span>اتجاه ترتيب الصفحة الأولى</span><select value={direction} onChange={(event) => setDirection(event.target.value as BookletDirection)}><option value="PAGE_ONE_LEFT">الصفحة 1 على اليسار — مطابق للمثال</option><option value="PAGE_ONE_RIGHT">الصفحة 1 على اليمين — ترتيب معكوس</option></select></label>
        <label><span>الغلاف</span><select value={coverMode} onChange={(event) => setCoverMode(event.target.value)}><option value="SEPARATE_BLANK_BACK">غلاف منفصل وظهره بلا طباعة</option><option value="SEPARATE_DUPLEX">غلاف منفصل مطبوع من الوجهين</option><option value="NO_COVER">بدون غلاف منفصل</option></select></label>
      </div>
      {error && <div className="alert error">{error}</div>}
    </section>
    {plan && <>
      <section className="booklet-summary">
        <div><span><BookOpenText size={20} /></span><small>صفحات المحتوى</small><b>{formatNumber(plan.pageCount)}</b></div>
        <div><span><Layers3 size={20} /></span><small>أوراق الطباعة</small><b>{formatNumber(plan.sheetCount)}</b></div>
        <div><span><Sparkles size={20} /></span><small>عدد الملازم</small><b>{formatNumber(plan.signatures.length)}</b></div>
        <div className={plan.blankPageCount ? 'warning' : 'ready'}><span><CheckCircle2 size={20} /></span><small>صفحات فارغة مطلوبة</small><b>{formatNumber(plan.blankPageCount)}</b></div>
      </section>
      <section className="booklet-guidance panel">
        <div><b>المقاس النهائي: {finishedSize}</b><span>كل ورقة تحمل 4 صفحات: صفحتان على الوجه الخارجي وصفحتان على الوجه الداخلي.</span></div>
        <div><b>{coverMode === 'SEPARATE_BLANK_BACK' ? 'الغلاف منفصل وظهره فارغ' : coverMode === 'SEPARATE_DUPLEX' ? 'الغلاف منفصل ومطبوع من الوجهين' : 'لا يوجد غلاف منفصل'}</b><span>ترتيب الأرقام أدناه خاص بصفحات المحتوى ولا يضيف الغلاف إلى الحساب.</span></div>
        <div><b>طريقة التنفيذ</b><span>اطبع الوجه الخارجي أولًا، اقلب الورقة حسب إعداد قلب الطابعة، ثم اطبع الوجه الداخلي. بعدها رتّب أوراق كل ملزمة من الخارج إلى الداخل واطوها من المنتصف.</span></div>
      </section>
      {plan.blankPageCount > 0 && <div className="alert warning booklet-blank-warning">أضيفت {formatNumber(plan.blankPageCount)} خانات فارغة تلقائيًا لأن عدد الصفحات يجب أن يكتمل إلى مضاعف 4. لا تضع محتوى في الخانات المكتوب عليها «فارغ».</div>}
      <div className="booklet-plan-heading"><div><span>مخطط الترتيب</span><h2>{formatNumber(plan.sheetCount)} ورقة مرتبة من الخارج إلى الداخل</h2></div><small>كل بطاقة تمثل ورقة واحدة ووجهيها</small></div>
      <div className="booklet-signatures">
        {plan.signatures.map((signature) => <section className="booklet-signature" key={signature.signatureNumber}>
          <header><div><span>الملزمة {formatNumber(signature.signatureNumber)}</span><h3>الصفحات {formatNumber(signature.firstPage)}–{formatNumber(signature.lastPage)}</h3></div><small>{formatNumber(signature.sheets.length)} ورقة</small></header>
          <div className="booklet-sheets">
            {signature.sheets.map((sheet) => <article className="booklet-sheet" key={sheet.sheetNumber}>
              <div className="booklet-sheet-number"><span>الورقة</span><b>{formatNumber(sheet.sheetNumber)}</b><small>داخل الملزمة: {formatNumber(sheet.sheetInSignature)}</small></div>
              <PrintedSide title="الوجه الخارجي" side={sheet.outside} tone="outside" />
              <PrintedSide title="الوجه الداخلي" side={sheet.inside} tone="inside" />
            </article>)}
          </div>
        </section>)}
      </div>
    </>}
  </div>
}
