import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, readdirSync, lstatSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { gunzipSync } from 'node:zlib'

export function runBun(cwd, args, { env = process.env, timeout = 240000 } = {}) {
  return spawnSync(process.versions.bun ? process.execPath : 'bun', args, { cwd, env, encoding: 'utf8', timeout, maxBuffer: 16 * 1024 * 1024 })
}

// Install the actual packaged dependency, not the framework source tree.
// Bun can resolve peer metadata even with --omit=peer. A frozen application
// install does not necessarily warm those manifests, so allow registry metadata
// fetches on a cache miss. Do not install peers or run lifecycle scripts; the
// browser consumer links the application's existing locked peer installations.
export function installFramework(cwd, archive, manifest) {
  const bytes = readFileSync(archive)
  assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.sha256)
  assert.equal('sha512-' + createHash('sha512').update(bytes).digest('base64'), manifest.integrity)
  const pkgPath = join(cwd, 'package.json'), pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  // A relative file URL avoids platform-specific absolute tarball resolution.
  writeFileSync(join(cwd, 'webblocks-fixture.tgz'), bytes, { flag: 'wx' })
  pkg.dependencies = { ...pkg.dependencies, [manifest.name]: 'file:./webblocks-fixture.tgz' }
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
  const result = runBun(cwd, ['install', '--prefer-offline', '--omit=peer', '--ignore-scripts', '--linker=hoisted', '--registry=https://registry.npmjs.org'])
  assert.equal(result.status, 0, result.error?.message ?? `${result.stdout}\n${result.stderr}`)
  assert.equal(createHash('sha256').update(readFileSync(archive)).digest('hex'), manifest.sha256)
  const installed = join(cwd, 'node_modules', manifest.name)
  const metadata = JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8'))
  for (const peer of Object.keys(metadata.peerDependencies ?? {})) {
    assert.equal(existsSync(join(cwd, 'node_modules', peer)), false, `Unexpected installed fixture peer: ${peer}`)
    assert.equal(existsSync(join(installed, 'node_modules', peer)), false, `Unexpected nested fixture peer: ${peer}`)
  }
  verifyInstalledFramework(installed, bytes, manifest)
  return installed
}

// Bun 1.4.5 adds a root .bun-tag file when installing a local tarball.
// Treat only that exact regular file as installer metadata, not package content.
export function verifyInstalledFramework(installed, bytes, manifest) {
  assert.ok(!manifest.files.includes('.bun-tag'), 'Installer metadata must not be in the archive')
  const installedPaths = []
  function walk(dir, prefix = '') {
    for (const name of readdirSync(dir)) {
      const path = prefix + name, full = join(dir, name), stat = lstatSync(full)
      if (path === '.bun-tag') {
        assert.ok(stat.isFile(), 'Expected a regular root .bun-tag metadata file')
        continue
      }
      if (stat.isDirectory()) {
        assert.ok(manifest.files.some(file => file.startsWith(path + '/')), `Unexpected directory: ${path}`)
        walk(full, path + '/')
      } else { assert.ok(stat.isFile(), path); installedPaths.push(path) }
    }
  }
  assert.ok(lstatSync(installed).isDirectory(), 'Installed package must be a real directory')
  walk(installed)
  assert.deepEqual(installedPaths.sort(), manifest.files)
  const tar = gunzipSync(bytes), paths = []
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512)
    if (header.every(b => b === 0)) break
    const field = (start, end) => header.subarray(start, end).toString('ascii').replace(/\0.*$/s, '')
    const prefix = field(345, 500), full = [prefix, field(0, 100)].filter(Boolean).join('/')
    assert.ok(full.startsWith('package/'))
    const path = full.slice(8), size = parseInt(field(124, 136), 8)
    assert.ok(manifest.files.includes(path) && !paths.includes(path))
    assert.equal(field(156, 157), '0')
    assert.deepEqual(readFileSync(join(installed, path)), tar.subarray(offset + 512, offset + 512 + size), path)
    paths.push(path); offset += 512 + Math.ceil(size / 512) * 512
  }
  assert.deepEqual(paths.sort(), manifest.files)
}
