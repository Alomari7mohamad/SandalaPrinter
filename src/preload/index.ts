import { contextBridge, ipcRenderer } from 'electron'
import { DESKTOP_API_KEY, type DesktopApi } from '../shared/contracts'

const api: DesktopApi = {
  app: { getInfo: () => ipcRenderer.invoke('app:get-info') },
  dashboard: { getStats: () => ipcRenderer.invoke('dashboard:get-stats') },
  catalog: {
    listCategories: () => ipcRenderer.invoke('catalog:list-categories'),
    saveCategory: (input) => ipcRenderer.invoke('catalog:save-category', input),
    listServices: () => ipcRenderer.invoke('catalog:list-services'),
    saveService: (input) => ipcRenderer.invoke('catalog:save-service', input),
    setServiceActive: (id, active) => ipcRenderer.invoke('catalog:set-service-active', id, active),
    deleteService: (id) => ipcRenderer.invoke('catalog:delete-service', id)
  },
  pricing: {
    listRules: (serviceId) => ipcRenderer.invoke('pricing:list-rules', serviceId),
    saveRule: (input) => ipcRenderer.invoke('pricing:save-rule', input),
    setRuleActive: (id, active) => ipcRenderer.invoke('pricing:set-rule-active', id, active),
    deleteRule: (id) => ipcRenderer.invoke('pricing:delete-rule', id),
    calculate: (serviceId, quantity) => ipcRenderer.invoke('pricing:calculate', serviceId, quantity)
  },
  orders: {
    create: (input) => ipcRenderer.invoke('orders:create', input),
    list: (query) => ipcRenderer.invoke('orders:list', query),
    get: (id) => ipcRenderer.invoke('orders:get', id),
    setPaymentStatus: (id, paid) => ipcRenderer.invoke('orders:set-payment-status', id, paid)
  },
  inventory: {
    list: () => ipcRenderer.invoke('inventory:list'),
    adjust: (input) => ipcRenderer.invoke('inventory:adjust', input),
    updateSettings: (input) => ipcRenderer.invoke('inventory:update-settings', input),
    createItem: (input) => ipcRenderer.invoke('inventory:create-item', input),
    deleteItem: (id) => ipcRenderer.invoke('inventory:delete-item', id)
  },
  shortages: {
    listSuppliers: () => ipcRenderer.invoke('shortages:list-suppliers'),
    saveSupplier: (input) => ipcRenderer.invoke('shortages:save-supplier', input),
    listRequests: () => ipcRenderer.invoke('shortages:list-requests'),
    saveRequest: (input) => ipcRenderer.invoke('shortages:save-request', input),
    deleteRequest: (id) => ipcRenderer.invoke('shortages:delete-request', id),
    openWhatsApp: (supplierId, message) => ipcRenderer.invoke('shortages:open-whatsapp', supplierId, message)
  },
  reports: {
    get: (range) => ipcRenderer.invoke('reports:get', range)
  },
  printing: {
    printOrder: (options) => ipcRenderer.invoke('printing:print-order', options)
  },
  maintenance: {
    clearSalesData: (confirmation) => ipcRenderer.invoke('maintenance:clear-sales-data', confirmation)
  },
  updates: {
    getSettings: () => ipcRenderer.invoke('updates:get-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('updates:save-settings', settings),
    getStatus: () => ipcRenderer.invoke('updates:get-status'),
    check: () => ipcRenderer.invoke('updates:check'),
    download: () => ipcRenderer.invoke('updates:download'),
    install: () => ipcRenderer.invoke('updates:install'),
    onStatusChanged: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, status: Parameters<typeof listener>[0]) => listener(status)
      ipcRenderer.on('updates:status-changed', handler)
      return () => ipcRenderer.removeListener('updates:status-changed', handler)
    }
  }
}

contextBridge.exposeInMainWorld(DESKTOP_API_KEY, api)
