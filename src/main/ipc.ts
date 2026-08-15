import { app, ipcMain, type WebContentsPrintOptions } from 'electron'
import { getDashboardStats } from './database/dashboard.repository'
import { getDatabasePath } from './database/client'
import { catalogService } from './services/catalog.service'
import type { PricingRuleInput, ServiceCategoryInput, ServiceInput } from '../shared/contracts'
import type { CreateOrderInput, InventoryAdjustmentInput, InventorySettingsInput, OrderListQuery, ReportRangeInput } from '../shared/contracts'
import type { PrintOrderOptions, UpdateSettingsDto } from '../shared/contracts'
import { orderService } from './services/order.service'
import { inventoryService } from './services/inventory.service'
import { reportsService } from './services/reports.service'
import * as updateService from './services/update.service'
import { clearSalesData } from './services/sales-maintenance.service'

export function registerIpcHandlers(): void {
  ipcMain.handle('app:get-info', () => ({ version: app.getVersion(), databasePath: getDatabasePath() }))
  ipcMain.handle('dashboard:get-stats', () => getDashboardStats())
  ipcMain.handle('catalog:list-categories', () => catalogService.listCategories())
  ipcMain.handle('catalog:save-category', (_event, input: ServiceCategoryInput) => catalogService.saveCategory(input))
  ipcMain.handle('catalog:list-services', () => catalogService.listServices())
  ipcMain.handle('catalog:save-service', (_event, input: ServiceInput) => catalogService.saveService(input))
  ipcMain.handle('catalog:set-service-active', (_event, id: string, active: boolean) => catalogService.setServiceActive(id, active))
  ipcMain.handle('catalog:delete-service', (_event, id: string) => catalogService.deleteService(id))
  ipcMain.handle('pricing:list-rules', (_event, serviceId: string) => catalogService.listRules(serviceId))
  ipcMain.handle('pricing:save-rule', (_event, input: PricingRuleInput) => catalogService.saveRule(input))
  ipcMain.handle('pricing:set-rule-active', (_event, id: string, active: boolean) => catalogService.setRuleActive(id, active))
  ipcMain.handle('pricing:delete-rule', (_event, id: string) => catalogService.deleteRule(id))
  ipcMain.handle('pricing:calculate', (_event, serviceId: string, quantity: number) => catalogService.calculate(serviceId, quantity))
  ipcMain.handle('orders:create', (_event, input: CreateOrderInput) => orderService.create(input))
  ipcMain.handle('orders:list', (_event, query: OrderListQuery) => orderService.list(query))
  ipcMain.handle('orders:get', (_event, id: string) => orderService.get(id))
  ipcMain.handle('orders:set-payment-status', (_event, id: string, paid: boolean) => orderService.setPaymentStatus(id, paid))
  ipcMain.handle('inventory:list', () => inventoryService.list())
  ipcMain.handle('inventory:adjust', (_event, input: InventoryAdjustmentInput) => inventoryService.adjust(input))
  ipcMain.handle('inventory:update-settings', (_event, input: InventorySettingsInput) => inventoryService.updateSettings(input))
  ipcMain.handle('reports:get', (_event, range: ReportRangeInput) => reportsService.get(range))
  ipcMain.handle('printing:print-order', (event, input: PrintOrderOptions) => {
    if (!input || !['THERMAL', 'A4', 'A5'].includes(input.pageSize)) {
      throw new Error('مقاس ورق الطباعة غير صالح.')
    }

    const thermalHeight = Math.min(1_000_000, Math.max(50_000, Math.round(input.contentHeightMicrons ?? 200_000)))
    const pageSize: WebContentsPrintOptions['pageSize'] = input.pageSize === 'THERMAL'
      ? { width: 80_000, height: thermalHeight }
      : input.pageSize

    return new Promise<void>((resolve, reject) => {
      event.sender.print({
        silent: true,
        printBackground: true,
        pageSize,
        margins: { marginType: 'none' }
      }, (success, failureReason) => {
        if (success) resolve()
        else reject(new Error(failureReason || 'تعذر إرسال الطلب إلى الطابعة الافتراضية.'))
      })
    })
  })
  ipcMain.handle('maintenance:clear-sales-data', (_event, confirmation: string) => {
    if (confirmation !== 'DELETE_SALES') throw new Error('تأكيد حذف بيانات المبيعات غير صالح.')
    return clearSalesData()
  })
  ipcMain.handle('updates:get-settings', () => updateService.getSettings())
  ipcMain.handle('updates:save-settings', (_event, settings: UpdateSettingsDto) => updateService.saveSettings(settings))
  ipcMain.handle('updates:get-status', () => updateService.getStatus())
  ipcMain.handle('updates:check', () => updateService.checkForUpdates())
  ipcMain.handle('updates:download', () => updateService.downloadUpdate())
  ipcMain.handle('updates:install', () => updateService.installUpdate())
}

export function unregisterIpcHandlers(): void {
  ipcMain.removeHandler('app:get-info')
  ipcMain.removeHandler('dashboard:get-stats')
  ipcMain.removeHandler('catalog:list-categories')
  ipcMain.removeHandler('catalog:save-category')
  ipcMain.removeHandler('catalog:list-services')
  ipcMain.removeHandler('catalog:save-service')
  ipcMain.removeHandler('catalog:set-service-active')
  ipcMain.removeHandler('catalog:delete-service')
  ipcMain.removeHandler('pricing:list-rules')
  ipcMain.removeHandler('pricing:save-rule')
  ipcMain.removeHandler('pricing:set-rule-active')
  ipcMain.removeHandler('pricing:delete-rule')
  ipcMain.removeHandler('pricing:calculate')
  ipcMain.removeHandler('orders:create')
  ipcMain.removeHandler('orders:list')
  ipcMain.removeHandler('orders:get')
  ipcMain.removeHandler('orders:set-payment-status')
  ipcMain.removeHandler('inventory:list')
  ipcMain.removeHandler('inventory:adjust')
  ipcMain.removeHandler('inventory:update-settings')
  ipcMain.removeHandler('reports:get')
  ipcMain.removeHandler('printing:print-order')
  ipcMain.removeHandler('maintenance:clear-sales-data')
  ipcMain.removeHandler('updates:get-settings')
  ipcMain.removeHandler('updates:save-settings')
  ipcMain.removeHandler('updates:get-status')
  ipcMain.removeHandler('updates:check')
  ipcMain.removeHandler('updates:download')
  ipcMain.removeHandler('updates:install')
}
