export function getArabicError(error: unknown, fallback = 'تعذر إكمال العملية. حاول مرة أخرى.'): string {
  if (!(error instanceof Error)) return fallback
  const message = error.message.replace(/^Error invoking remote method '[^']+': Error: /, '').trim()
  return /[\u0600-\u06ff]/.test(message) ? message : fallback
}
