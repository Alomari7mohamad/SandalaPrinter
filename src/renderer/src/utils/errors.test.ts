import { describe, expect, it } from 'vitest'
import { getArabicError } from './errors'

describe('visible error details', () => {
  it('preserves English database details received over Electron IPC', () => {
    expect(getArabicError(new Error("Error invoking remote method 'catalog:save-service': SqliteError: UNIQUE constraint failed: services.code"), 'تعذر الحفظ.')).toBe('تعذر الحفظ.\nتفاصيل الخطأ: UNIQUE constraint failed: services.code')
  })
  it('keeps Arabic context and the original validation reason', () => {
    expect(getArabicError(new Error('يوجد رمز بهذا الاسم.'), 'تعذر حفظ الخدمة.')).toContain('تعذر حفظ الخدمة.\nتفاصيل الخطأ: يوجد رمز بهذا الاسم.')
  })
  it('supports string errors, plain error objects, codes and nested causes', () => {
    expect(getArabicError('Failed to fetch')).toContain('Failed to fetch')
    expect(getArabicError({ message: 'Write failed', code: 'SQLITE_BUSY', cause: new Error('database is locked') })).toContain('Write failed\nرمز الخطأ: SQLITE_BUSY\ndatabase is locked')
  })
  it('does not expose arbitrary object contents and handles circular causes', () => {
    expect(getArabicError({ input: 'private customer information' }, 'خطأ')).toBe('خطأ')
    const error: { message: string; cause?: unknown } = { message: 'Failure' }
    error.cause = error
    expect(getArabicError(error)).toContain('Failure')
  })
})
