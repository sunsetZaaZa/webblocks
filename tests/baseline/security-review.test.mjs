import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, cpSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { readBunLock, reviewLock, reviewAssets, inspectPublicTree, assertPublicTree, prohibitedPublicPath } from '../../scripts/security-review.mjs'
import { publicSourceUrl, installedNotices, prepareLegal } from '../../scripts/prepare-legal.mjs'
import { decode, decodeLegacy, createPersistence } from '../../src/state-management/persistence.mjs'
import { loadEditorDefaults } from '../../config/editor-defaults.mjs'
const root = fileURLToPath(new URL('../../', import.meta.url))
const read = name => readFileSync(join(root, name), 'utf8')
const json = name => JSON.parse(read(name))
function temp(t) { const dir = mkdtempSync(join(tmpdir(), 'wgp18-')); t.after(() => rmSync(dir, { recursive: true, force: true })); return dir }

test('every locked Bun package has exact registry integrity, with missing license metadata explicit', () => {
  const lock = readBunLock(root); const report = reviewLock(lock)
  assert.equal(report.components.length, Object.keys(lock.packages).length)
  assert.ok(report.components.length > 0 && report.installScripts.length > 0)
  assert.equal(report.missingLicense.length, report.components.filter(c => !c.license).length)
  for (const entry of report.components) assert.equal(Buffer.from(entry.integrity.slice(7), 'base64').length, 64)
  const path = Object.keys(lock.packages)[0]
  for (const [index, value] of [[3, undefined], [1, 'https://example.org/a.tgz'], [1, 'https://registry.npmjs.org/other/-/other.tgz'], [0, 'file:../outside']]) {
    const copy = structuredClone(lock); copy.packages[path][index] = value
    assert.throws(() => reviewLock(copy))
  }
  lock.packages['../oops'] = lock.packages[path]; assert.throws(() => reviewLock(lock), /Unsafe dependency path/)
})

test('all retained font bytes and replacement artwork are covered by notices; changed files fail', t => {
  assert.deepEqual(reviewAssets(root), { fonts: 8, artwork: 12 })
  assert.doesNotMatch(read('src/index.css') + read('src/main.tsx'), /SimpleSquare/)
  const dir = temp(t)
  for (const path of ['src/assets/fonts', 'public', 'docs/artwork/wgp-01', 'LICENSE']) cpSync(join(root, path), join(dir, path), { recursive: true })
  const font = join(dir, 'src/assets/fonts/CorneritaRegular.ttf')
  writeFileSync(font, 'changed'); assert.throws(() => reviewAssets(dir), /Changed font/)
  cpSync(join(root, 'src/assets/fonts/CorneritaRegular.ttf'), font)
  writeFileSync(join(dir, 'public/duck.png'), 'changed'); assert.throws(() => reviewAssets(dir), /Changed artwork/)
})

test('public tree rejects sensitive files, source maps and token patterns without logging their values', t => {
  const dir = temp(t); mkdirSync(join(dir, 'assets')); mkdirSync(join(dir, '.vite'))
  writeFileSync(join(dir, 'index.html'), '<html>public page</html>'); writeFileSync(join(dir, '.vite/manifest.json'), '{}')
  assert.deepEqual(inspectPublicTree(dir), [])
  for (const path of ['.env.local', 'private.pem', 'assets/app.js.map', 'webblocks.defaults.json', '.npmrc']) assert.equal(prohibitedPublicPath(path), true)
  const token = 'ghp_' + 'X'.repeat(36)
  writeFileSync(join(dir, 'assets/app.js'), `const x = '${token}'`); writeFileSync(join(dir, '.env.local'), 'private')
  const problems = inspectPublicTree(dir)
  assert.equal(problems.length, 2); assert.ok(!problems.join('').includes(token)); assert.throws(() => assertPublicTree(dir), /possible credential/)
})

test('public scan and build defaults reject symbolic links', { skip: process.platform === 'win32' }, t => {
  const dir = temp(t); const publicDir = join(dir, 'public'); mkdirSync(publicDir)
  const other = join(dir, 'outside'); writeFileSync(other, 'private')
  symlinkSync(other, join(publicDir, 'linked.txt')); assert.throws(() => assertPublicTree(publicDir), /linked/)
  symlinkSync(other, join(dir, 'webblocks.defaults.json')); assert.throws(() => loadEditorDefaults(join(dir, 'webblocks.config.json'), 'test'), /regular|JSON file/)
})

test('storage rejects oversized raw legacy and current records before parsing and preserves last saved record', () => {
  const huge = ' '.repeat(2 * 1024 * 1024 + 1)
  assert.throws(() => decode(huge, 'site'), /Invalid saved/); assert.throws(() => decodeLegacy(huge), /Invalid saved/)
  const values = new Map(); const port = createPersistence({ getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,v), removeItem: k => values.delete(k) }, 'site')
  const state = { openControlPanel: false, openSettingsPanel: false, openControllerPanel: false, settingsCurrentArea: 0, rosterPage: 1, menuFields: { presistCharacters: true, targetFPS: 23, showFPS: false, runLength: 10, nonStop: false }, settingsFields: { juggleAnimationBounding: false }, characterTracker: Array.from({ length: 8 }, (_, i) => ({ page: i + 1, chars: [] })) }
  assert.equal(port.save(state), null); const before = values.get(port.key)
  state.characterTracker[0].chars.push({ identifier: 'a', type: 2, speaking: '界'.repeat(800000) })
  assert.match(port.save(state), /Could not save/); assert.equal(values.get(port.key), before)
})

test('source notice uses immutable revision and refuses publication with unestablished public source', () => {
  const options = { repository: 'owner/repo', revision: 'a'.repeat(40), directory: 'docs/website', isPrivate: 'false' }
  assert.equal(publicSourceUrl(options), `https://github.com/owner/repo/tree/${options.revision}/docs/website`)
  for (const mutation of [{ isPrivate: 'true' }, { isPrivate: '' }, { revision: 'main' }, { directory: '../secret' }, { repository: 'bad?x/y' }]) assert.throws(() => publicSourceUrl({ ...options, ...mutation }))
})

test('installed dependency notices use actual installed metadata and report missing license evidence', t => {
  const dir = temp(t); const name = 'fixture', version = '1.2.3', path = 'node_modules/fixture'
  const pkg = { name: 'test', dependencies: { [name]: version } }
  const lock = { lockfileVersion: 3, workspaces: { '': pkg }, packages: { [name]: [`${name}@${version}`, '', {}, 'sha512-' + 'A'.repeat(86) + '=='] } }
  writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg)); writeFileSync(join(dir, 'bun.lock'), JSON.stringify(lock)); mkdirSync(join(dir, path), { recursive: true }); mkdirSync(join(dir, 'dist/legal'), { recursive: true })
  writeFileSync(join(dir, path, 'package.json'), JSON.stringify({ name, version, license: 'MIT' })); assert.equal(installedNotices(dir).missing.length, 1)
  writeFileSync(join(dir, path, 'LICENSE'), 'Example notice'); assert.equal(installedNotices(dir).missing.length, 0)
  prepareLegal(dir, { repository: 'owner/repo', revision: 'b'.repeat(40), directory: '.', isPrivate: 'false' })
  assert.match(readFileSync(join(dir, 'dist/legal/dependency-notices.txt'), 'utf8'), /Example notice/)
  assert.match(readFileSync(join(dir, 'dist/legal/corresponding-source.txt'), 'utf8'), /github.com\/owner\/repo\/tree/)
  assert.throws(() => prepareLegal(dir), /EEXIST/)
})

test('CI requires inventory, SBOM, live advisory check and public-artifact gate before uploads', () => {
  const workflow = read('.github/workflows/reusable-build.yml'); const scripts = json('package.json').scripts
  const commands = ['security:inventory', 'security:sbom', 'security:audit', 'security:legal', 'security:artifact', 'verify:pages']
  let previous = -1
  for (const command of commands) { const position = workflow.indexOf(command); assert.ok(position > previous && position < workflow.indexOf('name: Upload qualified Pages build')); previous = position }
  assert.equal(scripts['security:audit'], 'bun scripts/bun-audit.mjs'); assert.match(read('scripts/bun-audit.mjs'), /--audit-level=high/)
  assert.doesNotMatch(workflow, /continue-on-error|bun audit fix/)
  assert.match(read('scripts/assert-pages-artifact.mjs'), /assertPublicTree\('dist'\)/)
})
