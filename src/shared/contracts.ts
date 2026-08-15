export interface DashboardStats {
  todaySales: number
  todayCost: number
  todayProfit: number
  todayOrders: number
  monthSales: number
  monthCost: number
  monthProfit: number
  monthExpenses: number
  monthNetProfit: number
  marginPercent: number
}

export interface AppInfo {
  version: string
  databasePath: string
}

export type UpdateState = 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'disabled' | 'error'
export const DEFAULT_UPDATE_FEED_URL = 'https://alomari7mohamad.github.io/SandalaPrinter'
export interface UpdateSettingsDto { feedUrl: string; autoCheck: boolean }
export interface UpdateStatusDto {
  state: UpdateState
  currentVersion: string
  availableVersion: string | null
  progress: number | null
  message: string
}

export interface ServiceCategoryDto { id: string; code: string; nameAr: string; active: boolean; sortOrder: number }
export interface ServiceCategoryInput { nameAr: string }

export interface ServiceDto {
  id: string
  code: string
  nameAr: string
  nameHe: string | null
  categoryId: string | null
  categoryName: string
  paperType: string | null
  size: string | null
  colorMode: string | null
  coverage: string | null
  unit: string
  costType: CostType
  unitCost: number | null
  costBatchSize: number | null
  active: boolean
  notes: string | null
  pricingRulesCount: number
  createdAt: string
  updatedAt: string
}

export interface ServiceInput {
  id?: string
  code: string
  nameAr: string
  nameHe: string | null
  categoryId: string
  paperType: string | null
  size: string | null
  colorMode: string | null
  coverage: string | null
  unit: string
  costType: CostType
  unitCost: number | null
  costBatchSize: number | null
  active: boolean
  notes: string | null
}

export interface PricingRuleInput {
  id?: string
  serviceId: string
  ruleType: PricingRuleType
  exactQuantity: number | null
  minQuantity: number | null
  maxQuantity: number | null
  fixedPrice: number | null
  unitPrice: number | null
  priority: number
  active: boolean
}

export interface CreateOrderItemInput { serviceId: string; quantity: number }
export interface CreateOrderInput {
  items: CreateOrderItemInput[]
  customerName: string | null
  customerPhone: string | null
  deliveryAddress: string | null
  businessLogoDataUrl: string | null
  notes: string | null
}
export interface CreateOrderResult {
  id: string
  orderNumber: string
  customerName: string
  total: number
  totalCost: number
  profit: number
  profitMargin: number
  itemsCount: number
}

export type OrderPaymentFilter = 'PAID' | 'UNPAID'
export type OrderSort = 'NEWEST' | 'HIGHEST_VALUE'
export interface OrderListQuery { search?: string; from?: string; to?: string; paymentStatus?: OrderPaymentFilter; sort?: OrderSort }
export interface OrderSummaryDto {
  id: string
  orderNumber: string
  customerName: string
  customerPhone: string | null
  total: number
  totalCost: number
  profit: number
  profitMargin: number
  status: string
  paymentStatus: string
  itemsCount: number
  orderedAt: string
}
export interface OrderItemDto {
  id: string
  serviceName: string
  serviceNameHe: string | null
  categoryName: string | null
  materialType: string | null
  size: string | null
  colorMode: string | null
  unit: string
  quantity: number
  unitSalePrice: number | null
  totalSalePrice: number
  totalCost: number
  profit: number
}
export interface OrderDetailDto extends OrderSummaryDto {
  deliveryAddress: string | null
  businessLogoDataUrl: string | null
  notes: string | null
  items: OrderItemDto[]
}

export interface InventoryItemDto {
  id: string
  name: string
  sku: string | null
  unit: string
  quantity: number
  lowStockThreshold: number
  purchaseCost: number
  active: boolean
  updatedAt: string
}
export interface InventoryAdjustmentInput {
  itemId: string
  type: 'ADD' | 'REMOVE'
  quantity: number
  notes: string | null
}
export interface InventorySettingsInput { itemId: string; lowStockThreshold: number; purchaseCost: number }

export interface ReportRangeInput { from: string; to: string }
export interface ReportSummaryDto {
  ordersCount: number
  itemsQuantity: number
  sales: number
  cost: number
  grossProfit: number
  expenses: number
  netProfit: number
  profitMargin: number
  averageOrder: number
}
export interface ReportPeriodRowDto {
  period: string
  ordersCount: number
  sales: number
  cost: number
  grossProfit: number
  expenses: number
  netProfit: number
}
export interface ReportServiceRowDto {
  serviceName: string
  categoryName: string | null
  quantity: number
  sales: number
  cost: number
  profit: number
}
export interface BusinessReportDto {
  range: ReportRangeInput
  summary: ReportSummaryDto
  daily: ReportPeriodRowDto[]
  monthly: ReportPeriodRowDto[]
  services: ReportServiceRowDto[]
  orderedServices: ReportServiceRowDto[]
}

export type PrintPageSize = 'THERMAL' | 'A4' | 'A5'
export interface PrintOrderOptions {
  pageSize: PrintPageSize
  contentHeightMicrons?: number
}

export interface DesktopApi {
  app: {
    getInfo: () => Promise<AppInfo>
  }
  dashboard: {
    getStats: () => Promise<DashboardStats>
  }
  catalog: {
    listCategories: () => Promise<ServiceCategoryDto[]>
    saveCategory: (input: ServiceCategoryInput) => Promise<ServiceCategoryDto>
    listServices: () => Promise<ServiceDto[]>
    saveService: (input: ServiceInput) => Promise<ServiceDto>
    setServiceActive: (id: string, active: boolean) => Promise<void>
    deleteService: (id: string) => Promise<void>
  }
  pricing: {
    listRules: (serviceId: string) => Promise<PriceRule[]>
    saveRule: (input: PricingRuleInput) => Promise<PriceRule>
    setRuleActive: (id: string, active: boolean) => Promise<void>
    deleteRule: (id: string) => Promise<void>
    calculate: (serviceId: string, quantity: number) => Promise<PricingResult>
  }
  orders: {
    create: (input: CreateOrderInput) => Promise<CreateOrderResult>
    list: (query: OrderListQuery) => Promise<OrderSummaryDto[]>
    get: (id: string) => Promise<OrderDetailDto>
    setPaymentStatus: (id: string, paid: boolean) => Promise<OrderSummaryDto>
  }
  inventory: {
    list: () => Promise<InventoryItemDto[]>
    adjust: (input: InventoryAdjustmentInput) => Promise<InventoryItemDto>
    updateSettings: (input: InventorySettingsInput) => Promise<InventoryItemDto>
  }
  reports: {
    get: (range: ReportRangeInput) => Promise<BusinessReportDto>
  }
  printing: {
    printOrder: (options: PrintOrderOptions) => Promise<void>
  }
  updates: {
    getSettings: () => Promise<UpdateSettingsDto>
    saveSettings: (settings: UpdateSettingsDto) => Promise<UpdateSettingsDto>
    getStatus: () => Promise<UpdateStatusDto>
    check: () => Promise<UpdateStatusDto>
    download: () => Promise<void>
    install: () => Promise<void>
    onStatusChanged: (listener: (status: UpdateStatusDto) => void) => () => void
  }
}
import type { CostType, PriceRule, PricingResult, PricingRuleType } from './pricing/pricing-types'

export const DESKTOP_API_KEY = 'desktopApi' as const
