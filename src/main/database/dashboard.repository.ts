import type { DashboardStats } from '../../shared/contracts'
import { getSqlite } from './client'

interface AggregateRow { sales: number | null; cost: number | null; profit: number | null; count: number }
interface ExpenseRow { expenses: number | null }

export function getDashboardStats(): DashboardStats {
  const database = getSqlite()
  const todayOrders = database.prepare(`
    SELECT COUNT(*) FROM orders
    WHERE status <> 'CANCELLED' AND date(ordered_at, 'localtime') = date('now', 'localtime')
  `).pluck().get() as number
  const today = database.prepare(`
    SELECT COALESCE(SUM(total), 0) sales, COALESCE(SUM(total_cost), 0) cost,
           COALESCE(SUM(profit), 0) profit, COUNT(*) count
    FROM orders WHERE status <> 'CANCELLED' AND payment_status = 'PAID'
      AND date(paid_at, 'localtime') = date('now', 'localtime')
  `).get() as AggregateRow
  const month = database.prepare(`
    SELECT COALESCE(SUM(total), 0) sales, COALESCE(SUM(total_cost), 0) cost,
           COALESCE(SUM(profit), 0) profit, COUNT(*) count
    FROM orders WHERE status <> 'CANCELLED' AND payment_status = 'PAID'
      AND strftime('%Y-%m', paid_at, 'localtime') = strftime('%Y-%m', 'now', 'localtime')
  `).get() as AggregateRow
  const expense = database.prepare(`
    SELECT COALESCE(SUM(amount), 0) expenses FROM expenses
    WHERE strftime('%Y-%m', expense_date, 'localtime') = strftime('%Y-%m', 'now', 'localtime')
  `).get() as ExpenseRow
  const monthSales = month.sales ?? 0
  const monthProfit = month.profit ?? 0
  const monthExpenses = expense.expenses ?? 0

  return {
    todaySales: today.sales ?? 0,
    todayCost: today.cost ?? 0,
    todayProfit: today.profit ?? 0,
    todayOrders,
    monthSales,
    monthCost: month.cost ?? 0,
    monthProfit,
    monthExpenses,
    monthNetProfit: monthProfit - monthExpenses,
    marginPercent: monthSales > 0 ? (monthProfit / monthSales) * 100 : 0
  }
}
