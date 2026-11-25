import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { profiles, contextOptions, isNavigationCancellation } from '../deployment/support/browser-profiles.mjs'
import { expectedInteractions } from '../deployment/support/browser-interactions.mjs'
import { assertBrowserMatrix, runBrowserMatrix } from '../deployment/support/browser-matrix.mjs'
import { stories } from '../deployment/support/storybook-qualify.mjs'
import { routes, routeAliases } from '../../src/routing/routes.mjs'

const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8')
const options = { directory: 'dist', base: '/example/', files: [{ path: 'index.html', bytes: 5, sha256: 'a'.repeat(64) }],
  site: { siteId: 'github:owner/example', site: {}, storybook: { publish: true }, editor: { enabled: true }, features: { characters: true, effects: true, animations: true } },
  content: { enabledPages: ['home', 'apps'] } }
function fixture(o = options) {
  const enabled = Object.entries(routes).filter(([key]) => o.content.enabledPages.includes(key)).map(([, path]) => path)
  const aliases = Object.entries(routeAliases).filter(([, to]) => enabled.includes(to)).map(([from]) => from)
  const disabled = [...Object.values(routes), ...Object.keys(routeAliases)].filter(path => !enabled.includes(path) && !aliases.includes(path))
  const application = () => ({ passed: true, base: o.base, errors: [], artifact: { passed: true, files: o.files }, browser: { status: 'passed', routes: enabled, aliases, disabledRoutes: disabled, interactions: expectedInteractions(o.site) } })
  const storybook = () => o.site.storybook.publish ? { status: 'passed', passed: true, base: o.base + 'storybook/', stories: Object.keys(stories), errors: [] } : { status: 'disabled' }
  return { application, storybook, report: () => structuredClone({ schemaVersion: 1, base: o.base, passed: true, cases: profiles.map(profile => ({ profile, passed: true, errors: [], application: application(), storybook: storybook() })) }) }
}

test('six required browser profiles use isolated desktop and touch viewport contexts without mobile-engine-only options', () => {
  assert.deepEqual(profiles.map(p => p.id), ['chromium-desktop', 'chromium-mobile', 'firefox-desktop', 'firefox-mobile', 'webkit-desktop', 'webkit-mobile'])
  for (const p of profiles) {
    const context = contextOptions(p)
    assert.equal(context.hasTouch, p.id.endsWith('mobile'))
    assert.equal(context.viewport.width, context.hasTouch ? 390 : 1440)
    assert.equal(context.acceptDownloads, true)
    assert.equal(Object.hasOwn(context, 'isMobile'), false)
    assert.notEqual(context.viewport, p.viewport)
  }
})

test('only known canceled document navigations are ignored across engines', () => {
  for (const errorText of ['net::ERR_ABORTED', 'NS_BINDING_ABORTED', 'cancelled']) {
    assert.equal(isNavigationCancellation({ isNavigationRequest: () => true, failure: () => ({ errorText }) }), true)
    assert.equal(isNavigationCancellation({ isNavigationRequest: () => false, failure: () => ({ errorText }) }), false)
  }
  assert.equal(isNavigationCancellation({ isNavigationRequest: () => true, failure: () => ({ errorText: 'net::ERR_CONNECTION_REFUSED' }) }), false)
})

test('matrix rejects missing engines, partial route and interaction coverage, changed artifact bytes and missing stories', () => {
  const { report } = fixture()
  assert.doesNotThrow(() => assertBrowserMatrix(report(), options))
  for (const mutate of [r => r.cases.pop(), r => r.cases[1].profile = r.cases[0].profile, r => r.cases[2].passed = false,
    r => r.cases[0].application.artifact.files = [], r => r.cases[0].application.browser.routes = [], r => r.cases[0].application.browser.interactions = {},
    r => r.cases[0].storybook.stories.pop(), r => r.cases[0].errors.push('error')]) {
    const value = report(); mutate(value); assert.throws(() => assertBrowserMatrix(value, options))
  }
})

test('disabled site features must be recorded as disabled, not passed or silently omitted', () => {
  const o = structuredClone(options); o.site.editor.enabled = false; o.site.features.effects = false; o.site.storybook.publish = false
  const { report } = fixture(o)
  assert.doesNotThrow(() => assertBrowserMatrix(report(), o))
  const invalid = report(); invalid.cases[0].application.browser.interactions.editor = 'passed'
  assert.throws(() => assertBrowserMatrix(invalid, o), /interaction coverage/)
  const withoutCharacters = structuredClone(options.site); withoutCharacters.features.characters = false
  assert.deepEqual(expectedInteractions(withoutCharacters), { fonts: 'passed', effects: 'passed', editor: 'passed', characterSheet: 'disabled', persistence: 'disabled', interchange: 'passed' })
})

test('matrix attempts all six application and Storybook cases even when the first browser fails', async () => {
  const { application, storybook } = fixture(); const attempted = []
  const result = await runBrowserMatrix(options, {
    qualify: async o => { attempted.push('app:' + o.browserProfile.id); if (o.browserProfile.id === profiles[0].id) throw new Error('engine unavailable'); return application() },
    storybook: async o => { attempted.push('storybook:' + o.browserProfile.id); return storybook() },
  })
  assert.deepEqual(attempted, profiles.flatMap(p => ['app:' + p.id, 'storybook:' + p.id]))
  assert.equal(result.passed, false); assert.equal(result.cases[0].passed, false); assert.match(result.cases[0].errors[0], /engine unavailable/)
  assert.ok(result.cases.slice(1).every(c => c.passed))
})

test('production and CI require all engines and exact cross-browser report before artifact upload', () => {
  const workflow = read('.github/workflows/reusable-build.yml')
  assert.match(workflow, /pw:install --with-deps chromium firefox webkit/)
  const gates = ['bun run verify:pages ', 'bun run verify:browsers ', 'bun scripts/assert-pages-artifact.mjs --require-cross-browser', 'name: Upload qualified Pages build', 'name: Upload qualified Pages artifact']
  for (let i = 1; i < gates.length; i++) assert.ok(workflow.indexOf(gates[i]) > workflow.indexOf(gates[i - 1]))
  assert.match(read('scripts/assert-pages-artifact.mjs'), /assertBrowserMatrix\(matrix,/)
  assert.match(read('vitest.storybook.config.ts'), /instances: \[\{ browser: 'chromium' \}, \{ browser: 'firefox' \}, \{ browser: 'webkit' \}\]/)
  assert.doesNotMatch(workflow, /continue-on-error/)
})

test('asset readiness waits for image decode and fonts, rejecting corrupt images and failed fonts', async () => {
  const { settleDocumentAssets, waitForRenderedAssets } = await import('../deployment/support/browser-profiles.mjs')
  const calls = []
  const image = { currentSrc: '/art.png', naturalWidth: 8, decode: async () => { calls.push('decode') } }
  const fonts = [{ family: 'CorneritaRegular', status: 'loaded' }]
  fonts.ready = { then(resolve) { calls.push('fonts'); resolve() } }
  const doc = { fonts, defaultView: { requestAnimationFrame: cb => { calls.push('frame'); queueMicrotask(cb) }, setTimeout, clearTimeout } }
  const body = { ownerDocument: doc, querySelectorAll: selector => { assert.equal(selector, 'img[src]'); return [image] } }
  await waitForRenderedAssets({ locator: selector => { assert.equal(selector, 'body'); return { evaluate: fn => fn(body) } } })
  assert.deepEqual(calls, ['frame', 'frame', 'decode', 'fonts'])
  image.naturalWidth = 0
  await assert.rejects(settleDocumentAssets(body), /no intrinsic width: \/art.png/)
  image.naturalWidth = 8
  image.decode = async () => { throw new Error('corrupt') }
  await assert.rejects(settleDocumentAssets(body), /Image decode failed: \/art.png: corrupt/)
  image.decode = async () => {}
  fonts[0].status = 'error'
  await assert.rejects(settleDocumentAssets(body), /Font failed: CorneritaRegular/)
})

test('browser matrix preserves nested Storybook failure details and still fails qualification', async () => {
  const { application, storybook } = fixture()
  const result = await runBrowserMatrix(options, {
    qualify: async () => application(),
    storybook: async ({ browserProfile }) => browserProfile.id === 'webkit-desktop'
      ? { ...storybook(), passed: false, status: 'failed', errors: ['speaking story reload: image failed'] }
      : storybook(),
  })
  assert.equal(result.passed, false)
  assert.equal(result.cases.filter(entry => !entry.passed).length, 1)
  assert.match(result.cases[4].errors[0], /speaking story reload: image failed/)
  assert.throws(() => assertBrowserMatrix(result, options))
})

test('character image trees retain stable keys across Redux updates and browser interactions settle assets', () => {
  const page = read('src/components/Characters/CharacterUtil.tsx')
  const viewer = read('src/components/CharacterViewer/CharacterViewer.tsx')
  const roster = read('src/components/ControlPanel/SettingsControlPanel/CharacterRoster/CharacterRoster.tsx')
  assert.equal([...page.matchAll(/key=\{character.identifier\}/g)].length, 2)
  assert.equal([...viewer.matchAll(/key=\{prop.info.identifier\}/g)].length, 2)
  assert.equal([...roster.matchAll(/key=\{entry.identifier\}/g)].length, 2)
  for (const source of [page, viewer, roster]) assert.doesNotMatch(source, /key=\{nanoid\(\)\}/)
  const interactions = read('tests/deployment/support/browser-interactions.mjs')
  assert.match(interactions, /const activate = async locator => \{\s*await waitForRenderedAssets\(page\)[\s\S]*locator.click\(\)\s*await waitForRenderedAssets\(page\)/)
  assert.match(interactions, /const reload = async \(\) => \{\s*await waitForRenderedAssets\(page\)[\s\S]*page.reload\(\)[\s\S]*await loadEditorFonts\(\)/)
  assert.match(interactions, /'CorneritaRegular'/)
})
