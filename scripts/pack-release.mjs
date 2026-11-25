import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { makeArchive } from './archive.mjs'
import { templateFiles } from './init-site.mjs'
import { packFramework } from './pack-framework.mjs'
import { validateSiteConfig } from '../config/site-config.mjs'
import { defaultContent } from '../site/default-content.mjs'
import { reviewLock, readBunLock, assertManifestLock } from './security-review.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const json = value => JSON.stringify(value, null, 2) + '\n'
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const regular = path => { const info = lstatSync(path); assert.ok(info.isFile() && info.nlink === 1, `Expected independent regular file: ${path}`); return readFileSync(path) }
const versionPattern = /^\d+\.\d+\.\d+$/
const status = 'candidate-not-production-approved'

// Portable deterministic USTAR archive: sorted ASCII paths, normalized modes,
// zero owner/time fields, no filesystem metadata or external tar executable.
export function sourceArchive(source = root) {
  const files = new Map(templateFiles(source).map(path => [path, regular(join(source, path))]))
  files.set('webblocks.config.json', Buffer.from(json(validateSiteConfig())))
  files.set('site/content.json', Buffer.from(json(defaultContent)))
  return makeArchive(files, 'webblocks')
}

function names(version) {
  assert.ok(versionPattern.test(version), 'Invalid framework release version')
  const pkg = `webblocks-webblocks-${version}.tgz`
  return [`webblocks-${version}-source.tar.gz`, pkg, `${pkg}.json`]
}
export function verifyRelease(directory) {
  assert.ok(lstatSync(directory).isDirectory(), 'Expected real release directory')
  const manifest = JSON.parse(regular(join(directory, 'release.json')))
  assert.equal(manifest.schemaVersion, 1); assert.equal(manifest.status, status)
  assert.equal(manifest.name, '@webblocks/webblocks')
  const expected = names(manifest.version)
  assert.deepEqual(readdirSync(directory).sort(), [...expected, 'release.json'].sort(), 'Unexpected release file inventory')
  assert.deepEqual(manifest.files.map(f => f.name), expected, 'Unexpected manifest inventory')
  for (const file of manifest.files) {
    const bytes = regular(join(directory, file.name))
    assert.equal(file.bytes, bytes.length, `Size mismatch: ${file.name}`)
    assert.equal(file.sha256, sha(bytes), `SHA-256 mismatch: ${file.name}`)
  }
  const pkg = JSON.parse(regular(join(directory, expected[2])))
  assert.equal(pkg.name, manifest.name); assert.equal(pkg.version, manifest.version); assert.equal(pkg.filename, expected[1])
  assert.equal(pkg.sha256, manifest.files[1].sha256)
  assert.equal(pkg.integrity, 'sha512-' + createHash('sha512').update(regular(join(directory, expected[1]))).digest('base64'))
  return manifest
}
export function packRelease(directory, source = root) {
  const metadata = JSON.parse(regular(join(source, 'packaging/package.json')))
  assert.equal(metadata.name, '@webblocks/webblocks')
  const expected = names(metadata.version)
  const locked = readBunLock(source)
  assertManifestLock(JSON.parse(regular(join(source, 'package.json'))), locked)
  reviewLock(locked)
  const bytes = sourceArchive(source)
  const target = resolve(directory)
  // Exclusive directory creation: no overwrites or cleanup of existing files.
  mkdirSync(target)
  try {
    writeFileSync(join(target, expected[0]), bytes, { flag: 'wx' })
    packFramework(target, source)
    const manifest = { schemaVersion: 1, name: metadata.name, version: metadata.version, status,
      files: expected.map(name => { const bytes = regular(join(target, name)); return { name, bytes: bytes.length, sha256: sha(bytes) } }) }
    writeFileSync(join(target, 'release.json'), json(manifest), { flag: 'wx' })
    return verifyRelease(target)
  } catch (error) { rmSync(target, { recursive: true, force: true }); throw error }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [command, directory = 'release-dist', ...extra] = process.argv.slice(2)
    if (!['pack','verify'].includes(command) || extra.length) throw new Error('Usage: bun scripts/pack-release.mjs pack|verify [new-output-directory]')
    console.log(json(command === 'pack' ? packRelease(directory) : verifyRelease(directory)))
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
