import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream, readFileSync, readdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compareVersions, nextVersion, parseOptions, readManifest, unexpectedFiles } from './release-utils.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const feed = 'https://alomari7mohamad.github.io/SandalaPrinter/'
const installer = 'Sandala-Printer-Setup.exe'
const releaseFiles = ['package.json', 'package-lock.json', installer, `${installer}.blockmap`, 'latest.yml']
const generatedFiles = ['tsconfig.node.tsbuildinfo', 'tsconfig.web.tsbuildinfo']
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const say = (message) => console.log(`\n[Sandala] ${message}`)

function command(program, args, capture = false) {
  const result = spawnSync(program, args, { cwd: root, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit', windowsHide: true, maxBuffer: 8 * 1024 * 1024 })
  if (result.error) throw new Error(`تعذر تشغيل ${program}: ${result.error.message}`)
  if (result.status !== 0) throw new Error(`فشل الأمر ${program} ${args.join(' ')}${capture ? `\n${result.stderr?.trim() ?? ''}` : ''}`)
  return result.stdout ?? ''
}
const git = (...args) => {
  const result = command('git', args, true)
  return args.includes('-z') ? result : result.trim()
}
function npm(...args) {
  if (!process.env.npm_execpath) throw new Error('شغّل الأداة باستخدام npm run release.')
  command(process.execPath, [process.env.npm_execpath, ...args])
}
async function remoteManifest() {
  const response = await fetch(`${feed}latest.yml?release-check=${Date.now()}`, { signal: AbortSignal.timeout(30_000), cache: 'no-store' })
  if (!response.ok) throw new Error(`تعذر قراءة مصدر التحديث: HTTP ${response.status}`)
  return readManifest(await response.text())
}
async function hashFile(path, algorithm = 'sha512', encoding = 'base64') {
  const hash = createHash(algorithm)
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest(encoding)
}

async function verifyLocal(version) {
  const manifest = readManifest(readFileSync(join(root, 'latest.yml'), 'utf8'))
  if (manifest.version !== version) throw new Error('رقم latest.yml لا يطابق package.json.')
  const size = statSync(join(root, installer)).size
  if (size >= 100 * 1024 * 1024) throw new Error('تجاوز ملف التثبيت حد GitHub للملف الواحد. يلزم نقل ملفات التوزيع إلى GitHub Releases قبل النشر.')
  if (size !== manifest.size || await hashFile(join(root, installer)) !== manifest.sha512) throw new Error('حجم ملف التثبيت أو بصمته لا يطابق latest.yml.')
  if (await hashFile(join(root, 'release', installer)) !== manifest.sha512) throw new Error('نسخة المثبت في جذر المشروع قديمة.')
  for (const file of ['latest.yml', `${installer}.blockmap`]) if (!readFileSync(join(root, file)).equals(readFileSync(join(root, 'release', file)))) throw new Error(`ملف التوزيع غير متطابق: ${file}`)
  const asar = createRequire(import.meta.url)('@electron/asar')
  const archive = join(root, 'release', 'win-unpacked', 'resources', 'app.asar')
  if (JSON.parse(asar.extractFile(archive, 'package.json')).version !== version) throw new Error('المثبت يحتوي رقم إصدار قديمًا.')
  const bundles = ['out/main/index.js', 'out/preload/index.cjs', 'out/renderer/index.html', ...readdirSync(join(root, 'out', 'renderer', 'assets')).map((name) => `out/renderer/assets/${name}`)]
  for (const file of bundles) if (!asar.extractFile(archive, normalize(file)).equals(readFileSync(join(root, file)))) throw new Error(`ملف غير مطابق للبناء المختبر: ${file}`)
  return manifest
}

async function waitForPages(sha) {
  say('انتظار نشر GitHub Pages…')
  let run
  for (let attempt = 0; attempt < 36; attempt++) {
    const runs = JSON.parse(command('gh', ['run', 'list', '--commit', sha, '--limit', '20', '--json', 'databaseId,workflowName'], true))
    run = runs.find((entry) => entry.workflowName === 'pages-build-deployment')
    if (run) break
    await sleep(5000)
  }
  if (!run) throw new Error('لم تبدأ عملية Pages بعد. افحص GitHub Actions، ثم شغّل npm run release -- --verify-only.')
  command('gh', ['run', 'watch', String(run.databaseId), '--exit-status', '--interval', '5'])
}

async function verifyPublished(expected) {
  say('التحقق من رقم الإصدار وبصمة الملف المنشور…')
  let ready = false
  for (let attempt = 0; attempt < 24; attempt++) {
    try {
      const published = await remoteManifest()
      if (published.version === expected.version && published.sha512 === expected.sha512 && published.size === expected.size) { ready = true; break }
      if (compareVersions(published.version, expected.version) > 0) throw new Error('نُشر إصدار أعلى أثناء التحقق. لا تعِد نشر إصدار أقدم.')
    } catch (error) {
      if (attempt === 23 || error.message.includes('إصدار أعلى')) throw error
    }
    await sleep(3000)
  }
  if (!ready) throw new Error('لم تصل ملفات الإصدار الجديدة إلى رابط التنزيل بعد. استخدم --verify-only لاحقًا.')
  const response = await fetch(`${feed}${installer}?version=${expected.version}&verify=${Date.now()}`, { signal: AbortSignal.timeout(120_000) })
  if (!response.ok || !response.body) throw new Error(`فشل تنزيل المثبت للتحقق: HTTP ${response.status}`)
  const hash = createHash('sha512')
  let bytes = 0
  for await (const chunk of response.body) { hash.update(chunk); bytes += chunk.length }
  if (hash.digest('base64') !== expected.sha512 || bytes !== expected.size) throw new Error('بصمة ملف التنزيل العام لا تطابق الإصدار المحلي.')
  const blockmap = await fetch(`${feed}${installer}.blockmap?verify=${Date.now()}`, { signal: AbortSignal.timeout(30_000) })
  if (!blockmap.ok || !Buffer.from(await blockmap.arrayBuffer()).equals(readFileSync(join(root, `${installer}.blockmap`)))) throw new Error('ملف blockmap المنشور غير مطابق.')
}

async function main() {
  const options = parseOptions(process.argv.slice(2))
  const current = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version
  const origin = git('remote', 'get-url', 'origin').replace(/\.git$/, '').toLowerCase()
  if (!['https://github.com/alomari7mohamad/sandalaprinter', 'git@github.com:alomari7mohamad/sandalaprinter'].includes(origin)) throw new Error('وجهة origin ليست مستودع SandalaPrinter المعتمد. لم يتم رفع شيء.')
  if (git('branch', '--show-current') !== 'main') throw new Error('انتقل إلى فرع main قبل إصدار التطبيق.')
  command('gh', ['auth', 'status'], true)
  if (options.verifyOnly) {
    const expected = await verifyLocal(current)
    await waitForPages(git('rev-parse', 'HEAD'))
    await verifyPublished(expected)
    say(`تم التحقق من نشر الإصدار ${current} بنجاح.`)
    return
  }
  if (git('status', '--porcelain')) throw new Error('توجد تعديلات غير محفوظة في Git. راجعها واحفظ تعديلات المصدر بعملية commit أولًا، ثم أعد npm run release. لا تضف قاعدة البيانات أو ملفات سرية.')
  // Fetching updates tracking references only; never pull, rebase or discard work.
  if (!options.dryRun) git('fetch', 'origin', 'main')
  const remoteSha = git('ls-remote', 'origin', 'refs/heads/main').split(/\s+/)[0]
  git('merge-base', '--is-ancestor', remoteSha, 'HEAD')
  git('push', '--dry-run', 'origin', 'HEAD:main')
  const published = await remoteManifest()
  const version = nextVersion(current, published.version, options)
  say(`المحلي ${current} | المنشور ${published.version} | الإصدار التالي ${version}`)
  if (options.dryRun) {
    say('الفحص ناجح. لم تتغير ملفات الإصدار ولم يتم بناء أو نشر أي شيء. شغّل npm run release للنشر.')
    return
  }
  npm('run', 'release:test')
  if (!options.retry) npm('version', version, '--no-git-tag-version', '--ignore-scripts')
  say('تشغيل الاختبارات وبناء مثبت Windows…')
  npm('run', 'electron:build')
  say('اختبار التطبيق على قواعد بيانات مؤقتة، دون إرسال طباعة فعلية…')
  for (const script of ['verify-product-tiers.mjs', 'verify-order-rounding.mjs', 'verify-product-counts.mjs', 'verify-pricing-hierarchy.mjs']) command(process.execPath, [`scripts/${script}`])
  const expected = await verifyLocal(version)
  git('restore', '--', ...generatedFiles)
  const unexpected = unexpectedFiles(git('status', '--porcelain=v1', '-z'), releaseFiles)
  if (unexpected.length) throw new Error(`تغيرت ملفات أخرى أثناء البناء؛ راجعها قبل النشر: ${unexpected.join(', ')}`)
  if (compareVersions(version, (await remoteManifest()).version) <= 0) throw new Error('نُشر هذا الرقم أو رقم أعلى أثناء البناء. لم يتم رفع نسخة قديمة فوقه.')
  say('حفظ ملفات الإصدار ورفعها معًا…')
  command('git', ['add', '--', ...releaseFiles])
  command('git', ['commit', '-m', `Release ${version}`])
  command('git', ['push', 'origin', 'HEAD:main'])
  await waitForPages(git('rev-parse', 'HEAD'))
  await verifyPublished(expected)
  say(`اكتمل نشر الإصدار ${version} والتحقق من ملف التثبيت. سيظهر للنسخ المثبّتة ذات الرقم الأقل عند فحص التحديثات.`)
  say(`رابط التنزيل: ${feed}${installer}?version=${version}`)
}

main().catch((error) => {
  console.error(`\nلم يكتمل الإصدار: ${error.message}`)
  console.error('لم تُحذف بيانات التطبيق أو تغييراتك. راجع المرحلة التي فشلت، ولا تستخدم force push.')
  console.error('إذا تم الرفع بالفعل فاستخدم: npm run release -- --verify-only')
  console.error('إذا فشل البناء بعد زيادة الرقم: احفظ الإصلاح وملفي package.json وpackage-lock.json في commit محلي، ثم npm run release -- --retry. التفاصيل في README.md.')
  process.exitCode = 1
})
