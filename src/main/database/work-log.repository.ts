import { randomUUID } from 'node:crypto'
import type { WorkLogDto, WorkLogInput, WorkLogReportDto } from '../../shared/contracts'
import { calculateWorkPay } from '../../shared/work-logs/work-pay'
import { getSqlite } from './client'

const selectColumns = `id, work_date workDate, regular_hours regularHours, overtime_hours increasedHours,
  hourly_rate hourlyRate, overtime_percentage additionPercentage, regular_pay regularPay,
  overtime_pay increasedPay, (overtime_pay - overtime_hours * hourly_rate) additionPay,
  total_pay totalPay, created_at createdAt, updated_at updatedAt`

export function saveWorkLog(input: WorkLogInput): WorkLogDto {
  const database = getSqlite()
  const pay = calculateWorkPay(input)
  const existingId = database.prepare('SELECT id FROM owner_work_logs WHERE work_date = ?').pluck().get(input.workDate) as string | undefined
  const id = existingId ?? randomUUID()
  database.prepare(`
    INSERT INTO owner_work_logs (id, work_date, regular_hours, overtime_hours, hourly_rate, overtime_percentage, regular_pay, overtime_pay, total_pay)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(work_date) DO UPDATE SET regular_hours=excluded.regular_hours, overtime_hours=excluded.overtime_hours,
      hourly_rate=excluded.hourly_rate, overtime_percentage=excluded.overtime_percentage, regular_pay=excluded.regular_pay,
      overtime_pay=excluded.overtime_pay, total_pay=excluded.total_pay, updated_at=CURRENT_TIMESTAMP
  `).run(id, input.workDate, input.regularHours, input.increasedHours, input.hourlyRate, input.additionPercentage, pay.regularPay, pay.increasedPay, pay.totalPay)
  return database.prepare(`SELECT ${selectColumns} FROM owner_work_logs WHERE work_date = ?`).get(input.workDate) as WorkLogDto
}

export function getWorkLogReport(from: string, to: string): WorkLogReportDto {
  const database = getSqlite()
  const rows = database.prepare(`SELECT ${selectColumns} FROM owner_work_logs WHERE work_date BETWEEN ? AND ? ORDER BY work_date DESC`).all(from, to) as WorkLogDto[]
  const summary = database.prepare(`SELECT COUNT(*) workDays, COALESCE(SUM(regular_hours),0) regularHours,
    COALESCE(SUM(overtime_hours),0) increasedHours, COALESCE(SUM(regular_hours + overtime_hours),0) totalHours,
    COALESCE(SUM(regular_pay),0) regularPay, COALESCE(SUM(overtime_pay),0) increasedPay,
    COALESCE(SUM(total_pay),0) totalPay
    FROM owner_work_logs WHERE work_date BETWEEN ? AND ?`).get(from, to) as WorkLogReportDto['summary']
  return { range: { from, to }, summary, rows }
}

export function deleteWorkLog(id: string): boolean {
  return getSqlite().prepare('DELETE FROM owner_work_logs WHERE id = ?').run(id).changes > 0
}
