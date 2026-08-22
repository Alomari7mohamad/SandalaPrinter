import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

const timestamps = {
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').notNull().default('CURRENT_TIMESTAMP')
}

export const serviceCategories = sqliteTable('service_categories', {
  id: text('id').primaryKey(),
  nameAr: text('name_ar').notNull(),
  code: text('code').notNull().unique(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps
})

export const services = sqliteTable('services', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').references(() => serviceCategories.id),
  code: text('code').notNull().unique(),
  nameAr: text('name_ar').notNull(),
  nameHe: text('name_he'),
  paperType: text('material_type'),
  size: text('size'),
  colorMode: text('color_mode'),
  coverage: text('coverage'),
  unit: text('unit').notNull(),
  itemType: text('item_type').notNull().default('SERVICE'),
  supplierId: text('supplier_id'),
  reorderPoint: real('reorder_point').notNull().default(1),
  minimumOrderQuantity: real('minimum_order_quantity').notNull().default(1),
  costType: text('cost_type').notNull().default('PER_UNIT'),
  unitCost: real('unit_cost'),
  costBatchSize: real('cost_batch_size'),
  costCalculation: text('cost_calculation').notNull().default('UNIT_COST'),
  saleCalculation: text('sale_calculation').notNull().default('PRICING_RULE'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  notes: text('notes'),
  ...timestamps
})

export const pricingRules = sqliteTable('pricing_rules', {
  id: text('id').primaryKey(),
  serviceId: text('service_id').notNull().references(() => services.id),
  ruleType: text('type').notNull(),
  minQuantity: real('min_quantity'),
  maxQuantity: real('max_quantity'),
  exactQuantity: real('exact_quantity'),
  fixedPrice: real('sale_price'),
  unitPrice: real('sale_unit_price'),
  priority: integer('priority').notNull().default(0),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  ...timestamps
})

export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  company: text('company'),
  notes: text('notes'),
  isCashCustomer: integer('is_cash_customer', { mode: 'boolean' }).notNull().default(false),
  ...timestamps
})

export const paymentMethods = sqliteTable('payment_methods', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  nameAr: text('name_ar').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps
})

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  customerId: text('customer_id').references(() => customers.id),
  status: text('status').notNull().default('NEW'),
  paymentStatus: text('payment_status').notNull().default('UNPAID'),
  subtotal: real('subtotal').notNull().default(0),
  discountType: text('discount_type').notNull().default('NONE'),
  discountValue: real('discount_value').notNull().default(0),
  discountAmount: real('discount_amount').notNull().default(0),
  total: real('total').notNull().default(0),
  totalCost: real('total_cost').notNull().default(0),
  profit: real('profit').notNull().default(0),
  profitMargin: real('profit_margin').notNull().default(0),
  paidAmount: real('paid_amount').notNull().default(0),
  remainingAmount: real('remaining_amount').notNull().default(0),
  customerNameSnapshot: text('customer_name_snapshot').notNull().default('زبون عام'),
  customerPhoneSnapshot: text('customer_phone_snapshot'),
  deliveryAddress: text('delivery_address'),
  businessLogoDataUrl: text('business_logo_data_url'),
  notes: text('notes'),
  orderedAt: text('ordered_at').notNull(),
  paidAt: text('paid_at'),
  cancelledAt: text('cancelled_at'),
  ...timestamps
})

export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id),
  serviceId: text('service_id').references(() => services.id),
  serviceCodeSnapshot: text('service_code_snapshot').notNull(),
  serviceNameSnapshot: text('service_name_snapshot').notNull(),
  serviceNameHeSnapshot: text('service_name_he_snapshot'),
  categorySnapshot: text('category_snapshot'),
  materialTypeSnapshot: text('material_type_snapshot'),
  sizeSnapshot: text('size_snapshot'),
  colorModeSnapshot: text('color_mode_snapshot'),
  unitSnapshot: text('unit_snapshot').notNull(),
  quantity: real('quantity').notNull(),
  unitCostSnapshot: real('unit_cost_snapshot').notNull(),
  totalCost: real('total_cost').notNull(),
  pricingRuleIdSnapshot: text('pricing_rule_id_snapshot'),
  pricingRuleSnapshot: text('pricing_rule_snapshot'),
  unitSalePrice: real('unit_sale_price'),
  totalSalePrice: real('total_sale_price').notNull(),
  profit: real('profit').notNull(),
  profitMargin: real('profit_margin').notNull(),
  manualPrice: integer('manual_price', { mode: 'boolean' }).notNull().default(false),
  ...timestamps
})

export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id),
  paymentMethodId: text('payment_method_id').references(() => paymentMethods.id),
  amount: real('amount').notNull(),
  paidAt: text('paid_at').notNull(),
  reference: text('reference'),
  notes: text('notes'),
  ...timestamps
})

export const expenseCategories = sqliteTable('expense_categories', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  nameAr: text('name_ar').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  ...timestamps
})

export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').references(() => expenseCategories.id),
  expenseDate: text('expense_date').notNull(),
  description: text('description').notNull(),
  amount: real('amount').notNull(),
  notes: text('notes'),
  ...timestamps
})

export const suppliers = sqliteTable('suppliers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  companyName: text('company_name').notNull(),
  whatsappPhone: text('whatsapp_phone').notNull(),
  productTypes: text('product_types'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  ...timestamps
})

export const inventoryItems = sqliteTable('inventory_items', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  sku: text('sku'),
  unit: text('unit').notNull(),
  quantity: real('quantity').notNull().default(0),
  lowStockThreshold: real('low_stock_threshold').notNull().default(0),
  purchaseCost: real('purchase_cost').notNull().default(0),
  supplierId: text('supplier_id').references(() => suppliers.id),
  reorderPoint: real('reorder_point').notNull().default(1),
  minimumOrderQuantity: real('minimum_order_quantity').notNull().default(1),
  catalogServiceId: text('catalog_service_id').references(() => services.id),
  categoryId: text('category_id').references(() => serviceCategories.id),
  packageEnabled: integer('package_enabled', { mode: 'boolean' }).notNull().default(false),
  packageName: text('package_name'),
  unitsPerPackage: real('units_per_package'),
  packagePrice: real('package_price'),
  packageNotes: text('package_notes'),
  reorderPackageCount: real('reorder_package_count'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  ...timestamps
}, (table) => [uniqueIndex('inventory_sku_unique').on(table.sku)])

export const inventoryTransactions = sqliteTable('inventory_transactions', {
  id: text('id').primaryKey(),
  inventoryItemId: text('inventory_item_id').notNull().references(() => inventoryItems.id),
  type: text('type').notNull(),
  quantity: real('quantity').notNull(),
  referenceType: text('reference_type'),
  referenceId: text('reference_id'),
  notes: text('notes'),
  occurredAt: text('occurred_at').notNull(),
  ...timestamps
})

export const purchaseRequests = sqliteTable('purchase_requests', {
  id: text('id').primaryKey(),
  inventoryItemId: text('inventory_item_id').notNull().unique().references(() => inventoryItems.id),
  supplierId: text('supplier_id').notNull().references(() => suppliers.id),
  requestedQuantity: real('requested_quantity').notNull(),
  unitPrice: real('unit_price').notNull().default(0),
  source: text('source').notNull().default('AUTO'),
  ...timestamps
})

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull().default('CURRENT_TIMESTAMP')
})

export const importHistory = sqliteTable('import_history', {
  id: text('id').primaryKey(),
  version: integer('version').notNull().unique(),
  fileName: text('file_name').notNull(),
  importedAt: text('imported_at').notNull(),
  importedBy: text('imported_by').notNull().default('مدير النظام'),
  addedServices: integer('added_services').notNull().default(0),
  updatedServices: integer('updated_services').notNull().default(0),
  disabledServices: integer('disabled_services').notNull().default(0),
  updatedRules: integer('updated_rules').notNull().default(0),
  result: text('result').notNull(),
  errorMessage: text('error_message'),
  ...timestamps
})

export const backupHistory = sqliteTable('backup_history', {
  id: text('id').primaryKey(),
  filePath: text('file_path').notNull(),
  type: text('type').notNull(),
  status: text('status').notNull(),
  sizeBytes: integer('size_bytes'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP')
})
