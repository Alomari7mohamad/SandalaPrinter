import type { DesktopApi } from '../../../shared/contracts'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const hasFunction = (value: Record<string, unknown>, key: string): boolean => typeof value[key] === 'function'

export function isDesktopApiAvailable(value: unknown): value is DesktopApi {
  if (!isRecord(value) || !isRecord(value.app) || !isRecord(value.dashboard) || !isRecord(value.catalog) || !isRecord(value.pricing) || !isRecord(value.orders) || !isRecord(value.inventory) || !isRecord(value.shortages) || !isRecord(value.reports) || !isRecord(value.workLogs) || !isRecord(value.printing) || !isRecord(value.maintenance) || !isRecord(value.updates)) return false
  return hasFunction(value.app, 'getInfo') &&
    hasFunction(value.dashboard, 'getStats') &&
    hasFunction(value.catalog, 'listCategories') &&
    hasFunction(value.catalog, 'saveCategory') &&
    hasFunction(value.catalog, 'listServices') &&
    hasFunction(value.catalog, 'saveService') &&
    hasFunction(value.catalog, 'setServiceActive') &&
    hasFunction(value.catalog, 'deleteService') &&
    hasFunction(value.pricing, 'listRules') &&
    hasFunction(value.pricing, 'saveRule') &&
    hasFunction(value.pricing, 'setRuleActive') &&
    hasFunction(value.pricing, 'deleteRule') &&
    hasFunction(value.pricing, 'calculate') &&
    hasFunction(value.orders, 'create') &&
    hasFunction(value.orders, 'list') &&
    hasFunction(value.orders, 'get') &&
    hasFunction(value.orders, 'setPaymentStatus') &&
    hasFunction(value.inventory, 'list') &&
    hasFunction(value.inventory, 'adjust') &&
    hasFunction(value.inventory, 'updateSettings') &&
    hasFunction(value.inventory, 'createItem') &&
    hasFunction(value.shortages, 'listSuppliers') &&
    hasFunction(value.shortages, 'saveSupplier') &&
    hasFunction(value.shortages, 'listRequests') &&
    hasFunction(value.shortages, 'saveRequest') &&
    hasFunction(value.shortages, 'deleteRequest') &&
    hasFunction(value.shortages, 'openWhatsApp') &&
    hasFunction(value.reports, 'get') &&
    hasFunction(value.workLogs, 'save') &&
    hasFunction(value.workLogs, 'getReport') &&
    hasFunction(value.printing, 'printOrder') &&
    hasFunction(value.maintenance, 'clearSalesData') &&
    hasFunction(value.updates, 'getSettings') &&
    hasFunction(value.updates, 'saveSettings') &&
    hasFunction(value.updates, 'getStatus') &&
    hasFunction(value.updates, 'check') &&
    hasFunction(value.updates, 'download') &&
    hasFunction(value.updates, 'install') &&
    hasFunction(value.updates, 'onStatusChanged')
}
