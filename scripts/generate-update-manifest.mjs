import { createHash } from 'node:crypto'
import { readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const packageJson = JSON.parse(await readFile(join(projectRoot, 'package.json'), 'utf8'))
const installerName = 'Sandala-Printer-Setup.exe'
const installerPath = join(projectRoot, 'release', installerName)
const installer = await readFile(installerPath)
const installerStats = await stat(installerPath)
const sha512 = createHash('sha512').update(installer).digest('base64')
const manifest = [
  `version: ${packageJson.version}`,
  'files:',
  `  - url: ${installerName}`,
  `    sha512: ${sha512}`,
  `    size: ${installerStats.size}`,
  `path: ${installerName}`,
  `sha512: ${sha512}`,
  `releaseDate: '${new Date().toISOString()}'`,
  ''
].join('\n')

await writeFile(join(projectRoot, 'release', 'latest.yml'), manifest, 'utf8')
console.log(`Generated release/latest.yml for version ${packageJson.version}`)
