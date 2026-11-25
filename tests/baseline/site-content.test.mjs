import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { validateSiteContent, loadSiteContent } from '../../config/site-content.mjs'
import { defaultContent } from '../../site/default-content.mjs'
import { routes } from '../../src/routing/routes.mjs'
import { contentMarkers } from '../deployment/support/qualify.mjs'
import { resolvePublicAsset } from '../../src/utilities/asset-path.mjs'
import { assertQualifiedArtifact } from '../../scripts/assert-pages-artifact.mjs'
const root = fileURLToPath(new URL('../../', import.meta.url))
const read = path => readFileSync(join(root, path), 'utf8')
const publicDir = join(root, 'public')

test('checked-in content validates and fallback retains original demonstration pages, labels and artwork', () => {
  assert.doesNotThrow(() => loadSiteContent(join(root, 'webblocks.config.json'), publicDir))
  assert.deepEqual(validateSiteContent({}, { publicDir }), defaultContent)
  assert.deepEqual(defaultContent.enabledPages, Object.keys(routes))
  assert.deepEqual(contentMarkers(defaultContent), { home: 'SOME HEADER', apps: 'app name', application: 'Current Version: 0.0.0', about: 'Template Key', privacy: 'UserPrivacy', libraries: 'Uses Router Link', softwarePackage: 'SECTION 1' })
  assert.deepEqual(defaultContent.navigation.map(entry => entry.label), ['homepage', 'apps', 'software libraries', 'user privacy'])
})

test('two repository configurations remain independent without mutating defaults', () => {
  const a = { pages: { home: { heading: 'Grid', hero: 'Puzzle framework' }, apps: { details: ['One', 'Two'] } } }
  const b = { pages: { home: { heading: 'Vault', hero: 'Private media' }, application: { version: '2.0.0' } } }
  const original = structuredClone(defaultContent)
  const grid = validateSiteContent(a)
  const vault = validateSiteContent(b)
  assert.equal(grid.pages.home.heading, 'Grid')
  assert.equal(vault.pages.home.heading, 'Vault')
  assert.equal(vault.pages.application.version, '2.0.0')
  assert.equal(grid.pages.application.version, '0.0.0')
  grid.pages.apps.details.push('Three')
  assert.deepEqual(a.pages.apps.details, ['One', 'Two'])
  assert.deepEqual(defaultContent, original)
})

test('template selection is stable and default navigation excludes disabled pages', () => {
  const result = validateSiteContent({ enabledPages: ['about', 'home', 'libraries'] })
  assert.deepEqual(result.enabledPages, ['home', 'about', 'libraries'])
  assert.deepEqual(result.navigation.map(entry => entry.page), ['home', 'libraries'])
  const custom = validateSiteContent({ enabledPages: ['home', 'about'], navigation: [{ page: 'home', label: 'Start' }, { page: 'about', label: 'Contact' }] })
  assert.deepEqual(custom.navigation.map(entry => entry.label), ['Start', 'Contact'])
  const homeOnly = validateSiteContent({ enabledPages: ['home'] })
  assert.deepEqual(homeOnly.navigation, [{ page: 'home', label: 'homepage' }])
})

test('invalid pages, navigation, versions, unknown keys and malformed text fail closed', () => {
  for (const input of [null, [], { schemaVersion: 2 }, { extra: true }, { enabledPages: [] }, { enabledPages: ['home', 'home'] }, { enabledPages: ['home', 'unknown'] }, { enabledPages: 'home' }, { navigation: [] }, { navigation: [{ page: 'apps', label: 'Apps' }] }, { enabledPages: ['home'], navigation: [{ page: 'home', label: 'Home' }, { page: 'apps', label: 'Apps' }] }, { navigation: [{ page: 'home', label: '' }] }, { navigation: [{ page: 'home', label: 'Home', href: 'https://example.com' }] }, { pages: { unknown: {} } }, { pages: { home: { heading: null } } }, { pages: { home: { heading: '\u0000' } } }, { pages: { apps: { details: [''] } } }, { pages: { apps: { details: 'a' } } }, JSON.parse('{"pages":{"home":{"__proto__":{}}}}')]) {
    assert.throws(() => validateSiteContent(input), /Invalid site content/, JSON.stringify(input))
  }
  const literal = '<script>alert(1)</script>'
  assert.equal(validateSiteContent({ pages: { home: { heading: literal } } }).pages.home.heading, literal)
})

test('repository image paths are self-contained, verified and deployment-relative', () => {
  const icon = 'characters/crunch_norm_right_web.png'
  const result = validateSiteContent({ pages: { apps: { icon } } }, { publicDir })
  assert.equal(resolvePublicAsset(result.pages.apps.icon, '/grid/'), '/grid/' + icon)
  assert.equal(resolvePublicAsset(result.pages.apps.icon, '/'), '/' + icon)
  for (const value of ['../duck.png', '/duck.png', 'https://example.com/duck.png', 'duck.png?x=1', 'duck.png#x', 'missing.png', 'x%2fduck.png', 'index.html', 'a\\duck.png']) {
    assert.throws(() => validateSiteContent({ pages: { apps: { icon: value } } }, { publicDir }), /Invalid site content/, value)
  }
  // Disabled pages can reference artwork not currently installed, but may not escape public/.
  assert.equal(validateSiteContent({ enabledPages: ['home'], pages: { apps: { icon: 'future.png' } } }, { publicDir }).pages.apps.icon, 'future.png')
})

test('loader uses the selected repository directory, rejects malformed and oversized files', t => {
  const dir = mkdtempSync(join(tmpdir(), 'webblocks-content-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const config = join(dir, 'webblocks.config.json')
  assert.deepEqual(loadSiteContent(config, publicDir), defaultContent)
  mkdirSync(join(dir, 'site'))
  const path = join(dir, 'site/content.json')
  writeFileSync(path, JSON.stringify({ pages: { home: { heading: 'Local repository' } } }))
  assert.equal(loadSiteContent(config, publicDir).pages.home.heading, 'Local repository')
  writeFileSync(path, '{ invalid')
  assert.throws(() => loadSiteContent(config, publicDir), /Cannot load/)
  writeFileSync(path, ' '.repeat(1024 * 1024 + 1))
  assert.throws(() => loadSiteContent(config, publicDir), /at most 1 MiB/)
})

test('symlink artwork cannot escape the public asset tree', { skip: process.platform === 'win32' }, t => {
  const dir = mkdtempSync(join(tmpdir(), 'webblocks-content-asset-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  mkdirSync(join(dir, 'public'))
  writeFileSync(join(dir, 'outside.png'), 'not public')
  symlinkSync(join(dir, 'outside.png'), join(dir, 'public', 'duck.png'))
  assert.throws(() => validateSiteContent({}, { publicDir: join(dir, 'public') }), /without symlinks/)
})

test('templates use validated plain text, dynamic image resolution and gated internal links', () => {
  for (const [name, key] of Object.entries({ 'Homepage.tsx': 'home', 'Apps.tsx': 'apps', 'OuterfacingBusinessContact.tsx': 'about', 'UserPrivacy.tsx': 'privacy', 'SoftwareLibraries.tsx': 'libraries', 'apps/Application.tsx': 'application', 'software_libraries/Package_Name.tsx': 'softwarePackage' })) {
    const source = read('src/tablets/' + name)
    assert.ok(source.includes(`siteContent.pages.${key}`))
    assert.ok(source.includes(`data-webblocks-page="${key}"`))
    assert.doesNotMatch(source, /dangerouslySetInnerHTML/)
  }
  assert.match(read('src/tablets/Apps.tsx'), /assetUrl\(content.icon\)/)
  assert.match(read('src/tablets/Apps.tsx'), /pageEnabled\('application'\)/)
  assert.match(read('src/tablets/apps/Application.tsx'), /pageEnabled\('privacy'\)/)
  assert.match(read('src/tablets/SoftwareLibraries.tsx'), /pageEnabled\('softwarePackage'\)/)
  assert.match(read('src/routing/AppRoutes.tsx'), /enabledPaths.has\(to\)/)
  assert.match(read('vite.config.ts'), /__WEBBLOCKS_CONTENT__: JSON.stringify\(content\)/)
})

test('production integrity gate rejects incomplete enabled, alias or disabled route coverage', async () => {
  const expectedContent = validateSiteContent({ enabledPages: ['home', 'apps'] })
  const browser = { status: 'passed', routes: ['/', '/apps'], aliases: [], disabledRoutes: ['/apps/application', '/about', '/user_privacy', '/software_libraries', '/software_libraries/package', '/apps/app', '/userprivacy', '/software_libaries'] }
  const report = { schemaVersion: 1, scope: 'artifact-and-browser', passed: true, artifact: { passed: true, base: '/' }, browser, errors: [], base: '/' }
  for (const [field, value, message] of [['routes', ['/'], /enabled route/], ['aliases', ['/apps/app'], /alias/], ['disabledRoutes', [], /disabled route/]]) {
    await assert.rejects(assertQualifiedArtifact({ directory: 'unused', base: '/', expectedContent, report: { ...report, browser: { ...browser, [field]: value } } }), message)
  }
})
