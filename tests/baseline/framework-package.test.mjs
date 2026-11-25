import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, renameSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
import { runBun, installFramework, verifyInstalledFramework } from '../deployment/support/bun-package.mjs'
import { makeArchive } from '../../scripts/archive.mjs'
import { stageFramework, packFramework } from '../../scripts/pack-framework.mjs'
import { templateFiles, createStarter } from '../../scripts/init-site.mjs'
const root = fileURLToPath(new URL('../../', import.meta.url))
const read = path => readFileSync(path, 'utf8')
const json = path => JSON.parse(read(path))
function temp(t) { const dir = mkdtempSync(join(tmpdir(), 'webblocks-package-test-')); t.after(() => rmSync(dir, { recursive: true, force: true })); return dir }
function run(cwd, args) { return spawnSync(process.execPath, args, { cwd, encoding: 'utf8' }) }
function pass(result) { assert.equal(result.status, 0, result.error?.message ?? result.stderr + result.stdout) }

test('package exposes only versioned public interfaces with peer dependencies and CSS side effects', t => {
  const target = temp(t); const { metadata, publicPaths } = stageFramework(root, target)
  assert.equal(metadata.name, '@webblocks/webblocks'); assert.match(metadata.version, /^\d+\.\d+\.\d+$/)
  assert.equal(metadata.license, 'GPL-3.0-or-later'); assert.equal(metadata.dependencies, undefined); assert.equal(metadata.scripts, undefined)
  assert.deepEqual(Object.keys(metadata.peerDependencies).sort(), ['react', 'react-dom', 'sass', 'vite'])
  assert.deepEqual(Object.keys(metadata.exports).sort(), ['.', './assets', './components', './package.json', './public/*'])
  for (const path of ['src/public-api.ts', 'src/utilities/asset-path.d.mts', 'src/components/Effects/webfall/webfall.scss', 'public/duck.png']) assert.ok(publicPaths.includes(path), path)
  assert.ok(metadata.sideEffects.includes('**/*.scss'))
  assert.match(read(join(target, 'components.d.ts')), /export \* from '.\/src\/public-api'/)
  assert.doesNotMatch(read(join(target, 'src/public-api.ts')), /state-management|AppRoutes|store/)
})

test('full starter payload preserves all allowed bytes, licenses, lockfiles, fonts and workflows', t => {
  const target = temp(t); const { payload } = stageFramework(root, target)
  assert.deepEqual(payload.map(x => x.path), templateFiles(root).sort())
  for (const entry of payload) {
    const bytes = Buffer.from(entry.data, 'base64')
    assert.deepEqual(bytes, readFileSync(join(root, entry.path)), entry.path)
    assert.equal(entry.sha256, createHash('sha256').update(bytes).digest('hex'))
  }
  for (const path of ['bun.lock', '.gitignore', '.github/workflows/reusable-build.yml', 'LICENSE', 'src/assets/fonts/ChakraPetchRegular.otf']) assert.ok(payload.some(x => x.path === path))
})

test('packaging a customized site does not include site-owned configuration or private files', t => {
  const dir = temp(t); const source = join(dir, 'site'); const target = join(dir, 'pack'); mkdirSync(target)
  createStarter(source, { owner: 'test', repo: 'private-site' }, root)
  writeFileSync(join(source, '.env.local'), 'secret')
  writeFileSync(join(source, 'public/project/private.txt'), 'private artwork')
  const { payload, publicPaths } = stageFramework(source, target)
  for (const path of ['webblocks.config.json', 'site/content.json', 'webblocks.defaults.json', '.env.local', 'public/project/private.txt']) {
    assert.ok(!payload.some(x => x.path === path)); assert.ok(!publicPaths.includes(path))
  }
})

test('installed package permits only Bun root metadata and verifies exact archive bytes', t => {
  const dir = temp(t)
  const files = new Map([['package.json', Buffer.from('{}')], ['src/example.mjs', Buffer.from('export default 1')]])
  const manifest = { files: [...files.keys()].sort() }
  const archive = makeArchive(files, 'package')
  mkdirSync(join(dir, 'src'))
  for (const [path, bytes] of files) writeFileSync(join(dir, path), bytes)
  const verify = () => verifyInstalledFramework(dir, archive, manifest)
  verify()
  const tag = join(dir, '.bun-tag')
  writeFileSync(tag, 'fixture installer metadata')
  verify()
  const nested = join(dir, 'src/.bun-tag')
  writeFileSync(nested, 'unexpected nested metadata')
  assert.throws(verify)
  rmSync(nested)
  const extra = join(dir, '.unexpected')
  writeFileSync(extra, 'unexpected content')
  assert.throws(verify)
  rmSync(extra)
  const empty = join(dir, 'unexpected-directory')
  mkdirSync(empty)
  assert.throws(verify, /Unexpected directory/)
  rmSync(empty, { recursive: true })
  writeFileSync(join(dir, 'src/example.mjs'), 'modified')
  assert.throws(verify)
  writeFileSync(join(dir, 'src/example.mjs'), files.get('src/example.mjs'))
  rmSync(tag)
  mkdirSync(tag)
  assert.throws(verify, /regular root/)
  rmSync(tag, { recursive: true })
  symlinkSync(join(dir, 'package.json'), tag, 'file')
  assert.throws(verify, /regular root/)
  rmSync(tag)
  assert.throws(() => verifyInstalledFramework(dir, archive, { files: ['.bun-tag', ...manifest.files] }), /must not be in the archive/)
  verify()
})

test('Bun-installed framework tarball resolves ESM helpers, preserves exports and safely generates a complete site', t => {
  const dir = temp(t); const { archive, manifest } = packFramework(join(dir, 'out'))
  assert.equal(manifest.sha256, createHash('sha256').update(readFileSync(archive)).digest('hex'))
  assert.match(manifest.integrity, /^sha512-/)
  assert.throws(() => packFramework(join(dir, 'out')), /overwrite/)
  const consumer = join(dir, 'consumer'); mkdirSync(consumer)
  writeFileSync(join(consumer, 'package.json'), '{"name":"test-consumer","private":true,"type":"module"}')
  const installed = installFramework(consumer, archive, manifest)
  assert.equal(json(join(installed, 'package.json')).version, manifest.version)
  writeFileSync(join(consumer, 'exports-check.mjs'), `import assert from 'node:assert/strict'; import { resolvePublicAsset } from '@webblocks/webblocks'; import { resolveMediaAsset } from '@webblocks/webblocks/assets'; assert.equal(resolvePublicAsset('duck.png','/test/'),'/test/duck.png'); assert.equal(resolveMediaAsset('https://example.org/x.png','/test/'),'https://example.org/x.png'); assert.ok(import.meta.resolve('@webblocks/webblocks/components').endsWith('/src/public-api.ts')); assert.ok(import.meta.resolve('@webblocks/webblocks/public/duck.png').endsWith('/public/duck.png')); assert.throws(()=>import.meta.resolve('@webblocks/webblocks/src/public-api.ts'));`)
  pass(run(consumer, ['exports-check.mjs']))
  const site = join(dir, 'generated'); const args = [join(installed, 'bin/create.mjs'), '--destination', site, '--owner', 'owner', '--repo', 'project']
  pass(runBun(consumer, ['--bun', 'run', 'webblocks-create', ...args.slice(1)])); assert.equal(json(join(site, 'webblocks.config.json')).repository.name, 'project')
  for (const path of templateFiles(root)) assert.deepEqual(readFileSync(join(site, path)), readFileSync(join(root, path)), path)
  assert.notEqual(run(consumer, args).status, 0)
  assert.ok(existsSync(join(site, 'webblocks.defaults.json')))
  const payload = json(join(installed, 'starter.json')); payload.files[0].sha256 = '0'.repeat(64)
  // Replace, rather than mutate, the installed file (Bun may hardlink cache entries).
  writeFileSync(join(installed, 'starter.json.invalid'), JSON.stringify(payload), { flag: 'wx' })
  renameSync(join(installed, 'starter.json.invalid'), join(installed, 'starter.json'))
  const invalid = join(dir, 'invalid'); const result = run(consumer, [args[0], '--destination', invalid, '--owner', 'owner', '--repo', 'project'])
  assert.notEqual(result.status, 0); assert.match(result.stderr, /integrity mismatch/); assert.equal(existsSync(invalid), false)
})


test('shared qualification requires the packaged consumer test before uploading any site artifact', () => {
  const workflow = read(join(root, '.github/workflows/reusable-build.yml'))
  const install = workflow.indexOf('bun run pw:install')
  const gate = workflow.indexOf('bun run test:package-consumer')
  assert.ok(install >= 0 && gate > install && gate < workflow.indexOf('name: Upload qualified Pages build'))
  assert.ok(gate < workflow.indexOf('name: Upload qualified Pages artifact'))
  assert.doesNotMatch(workflow, /continue-on-error|npm publish/)
})
