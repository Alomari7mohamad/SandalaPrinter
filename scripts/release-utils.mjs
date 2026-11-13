export function parseVersion(value) {
  if (!/^\d+\.\d+\.\d+$/.test(value)) throw new Error(`رقم إصدار غير صالح: ${value}. استخدم مثل 1.0.1.`)
  const parts = value.split('.').map(Number)
  if (parts.some((part) => !Number.isSafeInteger(part) || part > 65535) || parts.join('.') !== value) throw new Error(`رقم إصدار Windows غير صالح: ${value}`)
  return parts
}

export function compareVersions(left, right) {
  const a = parseVersion(left), b = parseVersion(right)
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1
  return 0
}

export function parseOptions(args) {
  const flags = new Set(['--dry-run', '--retry', '--verify-only'])
  for (const arg of args) if (arg.startsWith('--') && !flags.has(arg)) throw new Error(`خيار غير معروف: ${arg}`)
  const modes = args.filter((arg) => !arg.startsWith('--'))
  if (modes.length > 1 || args.includes('--retry') && modes.length || args.includes('--verify-only') && (modes.length || args.includes('--retry') || args.includes('--dry-run'))) throw new Error('اختر عملية إصدار واحدة فقط.')
  const mode = modes[0] ?? 'patch'
  if (!['patch', 'minor', 'major'].includes(mode)) parseVersion(mode)
  return { mode, dryRun: args.includes('--dry-run'), retry: args.includes('--retry'), verifyOnly: args.includes('--verify-only') }
}

export function nextVersion(current, published, options) {
  if (options.retry) {
    if (compareVersions(current, published) <= 0) throw new Error('لا يمكن إعادة نشر الرقم المنشور نفسه. استخدم npm run release لإصدار أعلى.')
    return current
  }
  const baseline = compareVersions(current, published) >= 0 ? current : published
  const parts = parseVersion(baseline)
  if (options.mode === 'major') { parts[0]++; parts[1] = 0; parts[2] = 0 }
  else if (options.mode === 'minor') { parts[1]++; parts[2] = 0 }
  else if (options.mode === 'patch') parts[2]++
  const result = ['patch', 'minor', 'major'].includes(options.mode) ? parts.join('.') : options.mode
  parseVersion(result)
  if (compareVersions(result, baseline) <= 0) throw new Error('يجب أن يكون الإصدار الجديد أعلى من النسخة المحلية والمنشورة.')
  return result
}

export function readManifest(text) {
  const version = text.match(/^version:\s*(\S+)\s*$/m)?.[1]
  const sha512 = text.match(/^sha512:\s*(\S+)\s*$/m)?.[1]
  const size = Number(text.match(/^\s+size:\s*(\d+)\s*$/m)?.[1])
  if (!version || !sha512 || !Number.isSafeInteger(size) || size <= 0) throw new Error('ملف latest.yml غير صالح أو غير مكتمل.')
  parseVersion(version)
  if (!/^[A-Za-z0-9+/]{86}==$/.test(sha512)) throw new Error('بصمة SHA512 غير صالحة في latest.yml.')
  return { version, sha512, size }
}

export function unexpectedFiles(status, allowed) {
  return status.split('\0').filter(Boolean).map((entry) => entry.slice(3)).filter((file) => !allowed.includes(file))
}
