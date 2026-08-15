import type { BusinessReportDto, ReportPeriodRowDto, ReportRangeInput, ReportServiceRowDto } from '../../shared/contracts'
import { getSqlite } from './client'

interface OrderAggregate { ordersCount: number; sales: number; cost: number; grossProfit: number }
interface PeriodOrderRow extends OrderAggregate { period: string }
interface PeriodExpenseRow { period: string; expenses: number }

const zero = (value: number | null | undefined) => Number(value ?? 0)

function mergePeriods(orderRows: PeriodOrderRow[], expenseRows: PeriodExpenseRow[]): ReportPeriodRowDto[] {
  const periods = new Map<string, ReportPeriodRowDto>()
  for (const row of orderRows) periods.set(row.period, { period: row.period, ordersCount: row.ordersCount, sales: zero(row.sales), cost: zero(row.cost), grossProfit: zero(row.grossProfit), expenses: 0, netProfit: zero(row.grossProfit) })
  for (const row of expenseRows) {
    const current = periods.get(row.period) ?? { period: row.period, ordersCount: 0, sales: 0, cost: 0, grossProfit: 0, expenses: 0, netProfit: 0 }
    current.expenses = zero(row.expenses)
    current.netProfit = current.grossProfit - current.expenses
    periods.set(row.period, current)
  }
  return [...periods.values()].sort((left, right) => left.period.localeCompare(right.period))
}

export function getBusinessReport(range: ReportRangeInput): BusinessReportDto {
  const database = getSqlite()
  const ordersCount = database.prepare(`
    SELECT COUNT(*) FROM orders
    WHERE date(ordered_at, 'localtime') BETWEEN date(?) AND date(?) AND status != 'CANCELLED'
  `).pluck().get(range.from, range.to) as number
  const orderSummary = database.prepare(`
    SELECT 0 ordersCount, COALESCE(SUM(total), 0) sales, COALESCE(SUM(total_cost), 0) cost,
      COALESCE(SUM(profit), 0) grossProfit
    FROM orders WHERE date(paid_at, 'localtime') BETWEEN date(?) AND date(?) AND status != 'CANCELLED' AND payment_status = 'PAID'
  `).get(range.from, range.to) as OrderAggregate
  const itemsQuantity = database.prepare(`
    SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE date(o.ordered_at, 'localtime') BETWEEN date(?) AND date(?) AND o.status != 'CANCELLED'
  `).pluck().get(range.from, range.to) as number
  const expenses = database.prepare(`SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE date(expense_date) BETWEEN date(?) AND date(?)`).pluck().get(range.from, range.to) as number

  const dailyOrders = database.prepare(`
    SELECT period, SUM(ordersCount) ordersCount, SUM(sales) sales, SUM(cost) cost, SUM(grossProfit) grossProfit
    FROM (
      SELECT date(ordered_at, 'localtime') period, COUNT(*) ordersCount, 0 sales, 0 cost, 0 grossProfit
      FROM orders WHERE date(ordered_at, 'localtime') BETWEEN date(?) AND date(?) AND status != 'CANCELLED'
      GROUP BY date(ordered_at, 'localtime')
      UNION ALL
      SELECT date(paid_at, 'localtime') period, 0 ordersCount, COALESCE(SUM(total), 0) sales,
        COALESCE(SUM(total_cost), 0) cost, COALESCE(SUM(profit), 0) grossProfit
      FROM orders WHERE date(paid_at, 'localtime') BETWEEN date(?) AND date(?) AND status != 'CANCELLED' AND payment_status = 'PAID'
      GROUP BY date(paid_at, 'localtime')
    ) GROUP BY period ORDER BY period
  `).all(range.from, range.to, range.from, range.to) as PeriodOrderRow[]
  const dailyExpenses = database.prepare(`
    SELECT substr(expense_date, 1, 10) period, COALESCE(SUM(amount), 0) expenses
    FROM expenses WHERE date(expense_date) BETWEEN date(?) AND date(?) GROUP BY substr(expense_date, 1, 10)
  `).all(range.from, range.to) as PeriodExpenseRow[]
  const monthlyOrders = database.prepare(`
    SELECT period, SUM(ordersCount) ordersCount, SUM(sales) sales, SUM(cost) cost, SUM(grossProfit) grossProfit
    FROM (
      SELECT strftime('%Y-%m', ordered_at, 'localtime') period, COUNT(*) ordersCount, 0 sales, 0 cost, 0 grossProfit
      FROM orders WHERE date(ordered_at, 'localtime') BETWEEN date(?) AND date(?) AND status != 'CANCELLED'
      GROUP BY strftime('%Y-%m', ordered_at, 'localtime')
      UNION ALL
      SELECT strftime('%Y-%m', paid_at, 'localtime') period, 0 ordersCount, COALESCE(SUM(total), 0) sales,
        COALESCE(SUM(total_cost), 0) cost, COALESCE(SUM(profit), 0) grossProfit
      FROM orders WHERE date(paid_at, 'localtime') BETWEEN date(?) AND date(?) AND status != 'CANCELLED' AND payment_status = 'PAID'
      GROUP BY strftime('%Y-%m', paid_at, 'localtime')
    ) GROUP BY period ORDER BY period
  `).all(range.from, range.to, range.from, range.to) as PeriodOrderRow[]
  const monthlyExpenses = database.prepare(`
    SELECT substr(expense_date, 1, 7) period, COALESCE(SUM(amount), 0) expenses
    FROM expenses WHERE date(expense_date) BETWEEN date(?) AND date(?) GROUP BY substr(expense_date, 1, 7)
  `).all(range.from, range.to) as PeriodExpenseRow[]
  const services = database.prepare(`
    SELECT oi.service_name_snapshot serviceName, oi.category_snapshot categoryName,
      COALESCE(SUM(oi.quantity), 0) quantity, COALESCE(SUM(oi.total_sale_price), 0) sales,
      COALESCE(SUM(oi.total_cost), 0) cost, COALESCE(SUM(oi.profit), 0) profit
    FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE date(o.paid_at, 'localtime') BETWEEN date(?) AND date(?) AND o.status != 'CANCELLED' AND o.payment_status = 'PAID'
    GROUP BY oi.service_name_snapshot, oi.category_snapshot ORDER BY sales DESC, serviceName
  `).all(range.from, range.to) as ReportServiceRowDto[]
  const orderedServices = database.prepare(`
    SELECT oi.service_name_snapshot serviceName, oi.category_snapshot categoryName,
      COALESCE(SUM(oi.quantity), 0) quantity, COALESCE(SUM(oi.total_sale_price), 0) sales,
      COALESCE(SUM(oi.total_cost), 0) cost, COALESCE(SUM(oi.profit), 0) profit
    FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE date(o.ordered_at, 'localtime') BETWEEN date(?) AND date(?) AND o.status != 'CANCELLED'
    GROUP BY oi.service_name_snapshot, oi.category_snapshot ORDER BY quantity DESC, sales DESC, serviceName
  `).all(range.from, range.to) as ReportServiceRowDto[]

  const sales = zero(orderSummary.sales)
  const cost = zero(orderSummary.cost)
  const grossProfit = zero(orderSummary.grossProfit)
  const expenseTotal = zero(expenses)
  return {
    range,
    summary: {
      ordersCount: zero(ordersCount), itemsQuantity: zero(itemsQuantity), sales, cost, grossProfit, expenses: expenseTotal,
      netProfit: grossProfit - expenseTotal,
      profitMargin: sales === 0 ? 0 : (grossProfit / sales) * 100,
      averageOrder: ordersCount === 0 ? 0 : sales / ordersCount
    },
    daily: mergePeriods(dailyOrders, dailyExpenses),
    monthly: mergePeriods(monthlyOrders, monthlyExpenses),
    services,
    orderedServices
  }
}
