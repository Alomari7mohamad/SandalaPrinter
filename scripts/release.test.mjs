import test from 'node:test'
import assert from 'node:assert/strict'
import { parseOptions, parseVersion, compareVersions, nextVersion, readManifest, unexpectedFiles } from './release-utils.mjs'

test('numeric versions and normal automatic increments', () => {
  assert.equal(compareVersions('1.0.10', '1.0.9'), 1)
  assert.equal(nextVersion('1.0.0', '1.0.0', parseOptions([])), '1.0.1')
  assert.equal(nextVersion('1.0.1', '1.0.1', parseOptions(['minor'])), '1.1.0')
  assert.equal(nextVersion('1.2.3', '1.2.3', parseOptions(['major'])), '2.0.0')
  assert.equal(nextVersion('1.0.0', '1.0.15', parseOptions([])), '1.0.16')
})
test('explicit versions cannot repeat or downgrade a release', () => {
  assert.throws(() => nextVersion('1.0.1', '1.0.1', parseOptions(['1.0.1'])))
  assert.throws(() => nextVersion('1.0.15', '1.0.0', parseOptions(['1.0.2'])))
  assert.equal(nextVersion('1.0.1', '1.0.1', parseOptions(['1.2.0'])), '1.2.0')
})
test('retry only resumes a version not yet published', () => {
  assert.equal(nextVersion('1.0.1', '1.0.0', parseOptions(['--retry'])), '1.0.1')
  assert.throws(() => nextVersion('1.0.1', '1.0.1', parseOptions(['--retry'])))
})
test('invalid and ambiguous commands are rejected', () => {
  for (const value of ['v1.0.0', '1.0', '01.0.0', '1.0.0-beta', '1.0.65536']) assert.throws(() => parseVersion(value))
  for (const args of [['--force'], ['minor', 'major'], ['--retry', '1.0.1'], ['--verify-only', '--retry']]) assert.throws(() => parseOptions(args))
  assert.equal(parseOptions(['--dry-run']).dryRun, true)
})
test('manifest requires a stable version, real checksum and size', () => {
  const hash = Buffer.alloc(64).toString('base64')
  assert.deepEqual(readManifest(`version: 1.0.1\nfiles:\n  - url: setup.exe\n    size: 100\nsha512: ${hash}\n`), { version: '1.0.1', sha512: hash, size: 100 })
  assert.throws(() => readManifest('version: 1.0.1'))
  assert.throws(() => readManifest('version: 1.0.1\nsha512: fake\n    size: 100'))
})
test('only explicit release files may be staged after a build', () => {
  assert.deepEqual(unexpectedFiles(' M package.json\0 M latest.yml\0?? private.txt\0', ['package.json', 'latest.yml']), ['private.txt'])
  assert.deepEqual(unexpectedFiles(' M package.json\0', ['package.json']), [])
})
