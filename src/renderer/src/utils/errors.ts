export function getArabicError(error: unknown, fallback = 'تعذر إكمال العملية. حاول مرة أخرى.'): string {
  const details: string[] = []
  const visited = new Set<unknown>()
  let current = error
  for (let depth = 0; depth < 4 && current != null && !visited.has(current); depth += 1) {
    visited.add(current)
    const record = typeof current === 'object' ? current as { message?: unknown; code?: unknown; cause?: unknown } : undefined
    const raw = typeof current === 'string' ? current : typeof record?.message === 'string' ? record.message : ''
    const message = raw.replace(/^Error invoking remote method '[^']+':\s*(?:\w*Error:\s*)?/, '').trim()
    if (message && !details.includes(message)) details.push(message)
    if (typeof record?.code === 'string' || typeof record?.code === 'number') details.push(`رمز الخطأ: ${record.code}`)
    current = record?.cause
  }
  return details.length ? `${fallback}\nتفاصيل الخطأ: ${details.join('\n')}` : fallback
}
