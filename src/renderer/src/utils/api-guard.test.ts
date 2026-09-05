import { describe, expect, it, vi } from 'vitest'
import { isDesktopApiAvailable } from './api-guard'

const validApi = () => ({
  app: { getInfo: vi.fn() }, dashboard: { getStats: vi.fn() },
  catalog: { listCategories: vi.fn(), saveCategory: vi.fn(), deleteCategory: vi.fn(), listServices: vi.fn(), saveService: vi.fn(), setServiceActive: vi.fn(), deleteService: vi.fn(), listMaterialRequirements: vi.fn(), saveMaterialRequirements: vi.fn() },
  pricing: { listRules: vi.fn(), saveRule: vi.fn(), setRuleActive: vi.fn(), deleteRule: vi.fn(), calculate: vi.fn() },
  orders: { create: vi.fn(), list: vi.fn(), get: vi.fn(), setPaymentStatus: vi.fn() },
  inventory: { list: vi.fn(), adjust: vi.fn(), updateSettings: vi.fn(), createItem: vi.fn(), deleteItem: vi.fn() },
  shortages: { listSuppliers: vi.fn(), saveSupplier: vi.fn(), listRequests: vi.fn(), saveRequest: vi.fn(), deleteRequest: vi.fn(), openWhatsApp: vi.fn() },
  reports: { get: vi.fn() },
  workLogs: { save: vi.fn(), getReport: vi.fn(), delete: vi.fn() },
  printing: { printOrder: vi.fn() },
  maintenance: { clearSalesData: vi.fn() },
  updates: { getSettings: vi.fn(), saveSettings: vi.fn(), getStatus: vi.fn(), check: vi.fn(), download: vi.fn(), install: vi.fn(), onStatusChanged: vi.fn() }
})

describe('isDesktopApiAvailable', () => {
  it('يقبل واجهة preload المكتملة', () => expect(isDesktopApiAvailable(validApi())).toBe(true))
  it('يرفض غياب contextBridge API', () => expect(isDesktopApiAvailable(undefined)).toBe(false))
  it('يرفض واجهة جزئية قبل تشغيل React', () => {
    const api = validApi()
    Reflect.deleteProperty(api, 'dashboard')
    expect(isDesktopApiAvailable(api)).toBe(false)
  })
})
