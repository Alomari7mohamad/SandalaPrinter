import { mkdir, writeFile } from 'node:fs/promises'

const port = process.argv[2] ?? '9333'
const screenshotDirectory = process.argv[3]
const testOrderWorkflow = process.argv.includes('--test-order')
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

async function findPage() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json())
      const page = targets.find((target) => target.type === 'page' && target.url.startsWith('http://localhost:'))
      if (page) return page
    } catch { /* Electron is still starting. */ }
    await wait(500)
  }
  throw new Error('تعذر العثور على صفحة Electron عبر منفذ الفحص.')
}

const page = await findPage()
const socket = new WebSocket(page.webSocketDebuggerUrl)
const pending = new Map()
const rendererErrors = []
let nextId = 1

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  if (message.id) {
    const request = pending.get(message.id)
    if (!request) return
    pending.delete(message.id)
    if (message.error) request.reject(new Error(message.error.message))
    else request.resolve(message.result)
    return
  }
  if (message.method === 'Runtime.exceptionThrown') rendererErrors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text)
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') rendererErrors.push(message.params.args.map((arg) => arg.value ?? arg.description).join(' '))
  if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') rendererErrors.push(message.params.entry.text)
})

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})

function command(method, params = {}) {
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params }))
  })
}

async function evaluate(expression) {
  const response = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text)
  return response.result.value
}

async function capture(name) {
  if (!screenshotDirectory) return
  await mkdir(screenshotDirectory, { recursive: true })
  const screenshot = await command('Page.captureScreenshot', { format: 'png', fromSurface: true })
  await writeFile(`${screenshotDirectory}/${name}.png`, Buffer.from(screenshot.data, 'base64'))
}

await command('Runtime.enable')
await command('Log.enable')
await command('Page.enable')
await evaluate(`location.hash = '#/'`)
await wait(1200)

const apiCheck = await evaluate(`(async () => ({
  desktopApi: typeof window.desktopApi,
  dashboardMethod: typeof window.desktopApi?.dashboard?.getStats,
  catalogMethod: typeof window.desktopApi?.catalog?.listServices,
  pricingMethod: typeof window.desktopApi?.pricing?.calculate,
  ordersListMethod: typeof window.desktopApi?.orders?.list,
  inventoryListMethod: typeof window.desktopApi?.inventory?.list,
  reportsGetMethod: typeof window.desktopApi?.reports?.get,
  appTitle: document.title,
  brandLogoLoaded: Boolean(document.querySelector('.brand-logo.full')?.complete && document.querySelector('.brand-logo.full')?.naturalWidth > 0),
  hasEasternArabicDigits: /[٠-٩]/.test(document.body.innerText),
  metricFontSize: getComputedStyle(document.querySelector('.metric-card strong')).fontSize,
  navigationFontSize: getComputedStyle(document.querySelector('.nav-item span')).fontSize,
  dashboardStats: await window.desktopApi.dashboard.getStats(),
  serviceCount: (await window.desktopApi.catalog.listServices()).length,
  dashboardVisible: document.querySelector('.page-header h1')?.textContent?.trim() === 'الرئيسية'
}))()`)
await capture('dashboard')

await evaluate(`location.hash = '#/services'`)
await wait(1400)
const servicesVisible = await evaluate(`document.querySelector('.page-header h1')?.textContent?.trim() === 'الخدمات والمنتجات' && document.body.innerText.includes('طباعة ورق A4 أبيض وأسود')`)
const servicesLayout = await evaluate(`(() => { const rect = document.querySelector('.page-header h1').getBoundingClientRect(); return { scrollX, viewportWidth: innerWidth, documentWidth: document.documentElement.scrollWidth, titleLeft: rect.left, titleRight: rect.right } })()`)
await capture('services')

await evaluate(`location.hash = '#/pricing'`)
await wait(900)
const pricingVisible = await evaluate(`document.querySelector('.page-header h1')?.textContent?.trim() === 'الأسعار' && document.body.innerText.includes('تجربة التسعير')`)
const pricingLayout = await evaluate(`(() => { const rect = document.querySelector('.page-header h1').getBoundingClientRect(); return { scrollX, viewportWidth: innerWidth, documentWidth: document.documentElement.scrollWidth, titleLeft: rect.left, titleRight: rect.right } })()`)
await capture('pricing')

let newOrderWorkflow = null
if (testOrderWorkflow) {
  await evaluate(`location.hash = '#/new-order'`)
  await wait(1300)
  const customerInitiallyCollapsed = await evaluate(`!document.querySelector('input[name="customerName"]') && document.querySelector('.customer-panel-toggle')?.getAttribute('aria-expanded') === 'false'`)
  await evaluate(`document.querySelector('.customer-panel-toggle')?.click()`)
  await wait(150)
  await evaluate(`(() => { const values = { customerName: 'زبون اختبار', customerPhone: '0591234567', deliveryAddress: 'رام الله - شارع الاختبار' }; const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; for (const [name, value] of Object.entries(values)) { const input = document.querySelector('input[name="' + name + '"]'); if (input) { setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); } } })()`)
  await evaluate(`(() => { const select = document.querySelector('select[name="serviceCategory"]'); const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; setter.call(select, 'paper'); select.dispatchEvent(new Event('change', { bubbles: true })); })()`)
  await wait(350)
  await evaluate(`(() => { const select = document.querySelector('select[name="serviceType"]'); const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; setter.call(select, 'A4'); select.dispatchEvent(new Event('change', { bubbles: true })); })()`)
  await wait(350)
  await evaluate(`(() => { const select = document.querySelector('select[name="serviceProduct"]'); const value = [...select.options].find((option) => option.value)?.value; const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; setter.call(select, value); select.dispatchEvent(new Event('change', { bubbles: true })); })()`)
  await wait(250)
  await evaluate(`(() => { const input = document.querySelector('input[name="serviceQuantity"]'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(input, '11'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`)
  await wait(500)
  const automaticPricing = await evaluate(`({
    pageVisible: document.querySelector('.page-header h1')?.textContent?.trim() === 'طلب جديد',
    customerInitiallyCollapsed: ${JSON.stringify(customerInitiallyCollapsed)},
    automaticResultVisible: Boolean(document.querySelector('.automatic-price-result')),
    automaticSaleText: document.querySelector('.automatic-price-result > div b')?.textContent?.trim(),
    flexibleQuantityInput: document.querySelector('[name="serviceQuantity"]')?.tagName === 'INPUT' && document.querySelector('[name="serviceQuantity"]')?.value === '11',
    hasCalculateButton: [...document.querySelectorAll('button')].some((button) => button.textContent.includes('احسب')),
    internalDetailsHidden: !document.body.innerText.includes('هامش الربح'),
    addEnabled: !document.querySelector('.add-service-button')?.disabled
  })`)
  await evaluate(`document.querySelector('.add-service-button').click()`)
  await wait(300)
  const draftAdded = await evaluate(`document.querySelectorAll('.order-items-table tbody tr').length === 1 && !document.querySelector('.save-order-button').disabled`)
  await evaluate(`document.querySelector('.save-order-button').click()`)
  await wait(900)
  const savedText = await evaluate(`document.querySelector('.success-alert')?.innerText ?? ''`)
  await evaluate(`document.querySelector('select[name="serviceQuantity"], input[name="serviceQuantity"]')?.dispatchEvent(new Event('change', { bubbles: true }))`)
  await wait(200)
  await evaluate(`document.querySelector('.add-service-button')?.click()`)
  await wait(250)
  await evaluate(`document.querySelector('.save-order-button')?.click()`)
  await wait(900)
  const generalCustomerSavedText = await evaluate(`document.querySelector('.success-alert')?.innerText ?? ''`)
  await evaluate(`(() => { const select = document.querySelector('select[name="serviceCategory"]'); const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; setter.call(select, 'cards'); select.dispatchEvent(new Event('change', { bubbles: true })); })()`)
  await wait(350)
  await evaluate(`(() => { const select = document.querySelector('select[name="serviceType"]'); const value = [...select.options].find((option) => option.value)?.value; const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; setter.call(select, value); select.dispatchEvent(new Event('change', { bubbles: true })); })()`)
  await wait(350)
  await evaluate(`(() => { const select = document.querySelector('select[name="serviceProduct"]'); const value = [...select.options].find((option) => option.value)?.value; const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; setter.call(select, value); select.dispatchEvent(new Event('change', { bubbles: true })); })()`)
  await wait(900)
  const fixedQuantityControl = await evaluate(`(() => { const control = document.querySelector('[name="serviceQuantity"]'); return { tagName: control?.tagName, options: [...(control?.options ?? [])].map((option) => option.value).filter(Boolean) } })()`)
  newOrderWorkflow = { automaticPricing, draftAdded, savedText, generalCustomerSavedText, fixedQuantityControl, saved: savedText.includes('ORD-') && savedText.includes('زبون اختبار') && generalCustomerSavedText.includes('زبون عام') }
  await capture('new-order-saved')
}

await evaluate(`location.hash = '#/orders'`)
await wait(900)
const ordersCheck = await evaluate(`({
  visible: document.querySelector('.page-header h1')?.textContent?.trim() === 'الطلبات',
  rows: document.querySelectorAll('.orders-table tbody tr').length,
  hasError: Boolean(document.querySelector('.alert.error'))
})`)
if (ordersCheck.rows > 0) {
  await evaluate(`document.querySelector('.view-order-button')?.click()`)
  await wait(450)
}
const orderDetailsVisible = await evaluate(`Boolean(document.querySelector('.order-detail-modal') && document.querySelector('.order-detail-items tbody tr'))`)
await capture('orders')

let inventoryMutation = null
if (testOrderWorkflow) {
  inventoryMutation = await evaluate(`(async () => { const items = await window.desktopApi.inventory.list(); const first = items[0]; const saved = await window.desktopApi.inventory.adjust({ itemId: first.id, type: 'ADD', quantity: 5, notes: 'فحص آلي' }); return { count: items.length, item: saved.name, quantity: saved.quantity, added: saved.quantity - first.quantity }; })()`)
}
await evaluate(`location.hash = '#/inventory'`)
await wait(900)
const inventoryCheck = await evaluate(`({
  visible: document.querySelector('.page-header h1')?.textContent?.trim() === 'المخزون',
  rows: document.querySelectorAll('.inventory-table tbody tr').length,
  hasError: Boolean(document.querySelector('.alert.error'))
})`)
await capture('inventory')

await evaluate(`location.hash = '#/reports'`)
await wait(950)
const reportsCheck = await evaluate(`({
  visible: document.querySelector('.page-header h1')?.textContent?.trim() === 'التقارير',
  metrics: document.querySelectorAll('.report-metrics > div').length,
  hasError: Boolean(document.querySelector('.alert.error'))
})`)
await capture('reports')

await evaluate(`location.hash = '#/profits'`)
await wait(950)
const profitsCheck = await evaluate(`({
  visible: document.querySelector('.page-header h1')?.textContent?.trim() === 'الأرباح',
  metrics: document.querySelectorAll('.profit-metrics > div').length,
  hasError: Boolean(document.querySelector('.alert.error'))
})`)
await capture('profits')

const report = { apiCheck, servicesVisible, servicesLayout, pricingVisible, pricingLayout, newOrderWorkflow, ordersCheck, orderDetailsVisible, inventoryMutation, inventoryCheck, reportsCheck, profitsCheck, rendererErrors }
console.log(JSON.stringify(report, null, 2))
socket.close()

if (apiCheck.desktopApi !== 'object' || apiCheck.dashboardMethod !== 'function' || apiCheck.catalogMethod !== 'function' || apiCheck.pricingMethod !== 'function' || apiCheck.ordersListMethod !== 'function' || apiCheck.inventoryListMethod !== 'function' || apiCheck.reportsGetMethod !== 'function' || apiCheck.appTitle !== 'Sandala Printer' || !apiCheck.brandLogoLoaded || apiCheck.hasEasternArabicDigits || parseFloat(apiCheck.metricFontSize) < 24 || parseFloat(apiCheck.navigationFontSize) < 14 || !apiCheck.dashboardVisible || !servicesVisible || servicesLayout.titleLeft < 0 || servicesLayout.titleRight > servicesLayout.viewportWidth || !pricingVisible || pricingLayout.titleLeft < 0 || pricingLayout.titleRight > pricingLayout.viewportWidth || !ordersCheck.visible || ordersCheck.hasError || (testOrderWorkflow && (ordersCheck.rows < 2 || !orderDetailsVisible || inventoryMutation?.count !== 18 || inventoryMutation?.added !== 5)) || !inventoryCheck.visible || inventoryCheck.rows !== 18 || inventoryCheck.hasError || !reportsCheck.visible || reportsCheck.metrics !== 4 || reportsCheck.hasError || !profitsCheck.visible || profitsCheck.metrics !== 6 || profitsCheck.hasError || (testOrderWorkflow && (!newOrderWorkflow?.automaticPricing?.pageVisible || !newOrderWorkflow?.automaticPricing?.customerInitiallyCollapsed || !newOrderWorkflow?.automaticPricing?.automaticResultVisible || !newOrderWorkflow?.automaticPricing?.flexibleQuantityInput || newOrderWorkflow?.automaticPricing?.hasCalculateButton || !newOrderWorkflow?.automaticPricing?.internalDetailsHidden || !newOrderWorkflow?.automaticPricing?.addEnabled || !newOrderWorkflow?.draftAdded || !newOrderWorkflow?.saved || newOrderWorkflow?.fixedQuantityControl?.tagName !== 'SELECT' || newOrderWorkflow?.fixedQuantityControl?.options?.join(',') !== '100,200,500,1000')) || rendererErrors.length > 0) process.exitCode = 1
