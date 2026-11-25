import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { EventEmitter } from 'node:events'
import { runInNewContext } from 'node:vm'
import { assertStoryCompletion, waitForStoryCompletion, trackStorybookRequests } from '../deployment/support/storybook-qualify.mjs'
import { storybookBasePath } from '../../config/storybook-deployment.mjs'
import { resolvePublicAsset } from '../../src/utilities/asset-path.mjs'

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('Storybook resolves root and nested deployment paths independently of the app', () => {
  assert.equal(storybookBasePath({}, true), '/')
  assert.equal(storybookBasePath({ WEBBLOCKS_BASE_PATH: '/project/', WEBBLOCKS_DEPLOYMENT: 'github-pages' }, true), '/')
  const env = { WEBBLOCKS_STORYBOOK_BASE_PATH: '/project/storybook' }
  assert.equal(storybookBasePath(env, true), '/project/storybook/')
  assert.equal(storybookBasePath(env, false), '/')
  assert.equal(resolvePublicAsset('duck.png', storybookBasePath(env, true)), '/project/storybook/duck.png')
})

test('Storybook rejects malformed explicit mount paths', () => {
  for (const value of ['', 'auto', './', '//other/', '/a/../b/', '/a?x=1', '/%2e%2e/', 'https://example.com/']) {
    assert.throws(() => storybookBasePath({ WEBBLOCKS_STORYBOOK_BASE_PATH: value }, true), /WEBBLOCKS_BASE_PATH/)
  }
})

test('Storybook uses its own Vite config, automatic annotations and memory-only fixtures', () => {
  const main = read('.storybook/main.ts')
  const vite = read('.storybook/vite.config.ts')
  const vitest = read('vitest.storybook.config.ts')
  assert.match(main, /viteConfigPath:.*vite\.config\.ts/)
  assert.match(main, /storybookBasePath\(process.env/)
  assert.match(vite, /publicDir: false/)
  assert.doesNotMatch(vite, /loadSiteConfig|loadEditorDefaults|webblocks-site-metadata/)
  assert.doesNotMatch(vitest, /setupFiles:|storybookScript:/)
  assert.match(vitest, /passWithNoTests: false/)
  assert.match(read('src/test/storybook/decorators/withReduxStore.tsx'), /configureStore\(/)
  assert.doesNotMatch(read('src/test/storybook/decorators/withReduxStore.tsx'), /localStorage|createSiteStore/)
  assert.match(read('src/test/storybook/decorators/withRouter.tsx'), /MemoryRouter/)
  assert.match(read('src/test/storybook/fixtures/animationStateFixtures.ts'), /output\[key\] = cloneState\(patchValue\)/)
})

test('every component story has a play function and is covered by the production smoke matrix', () => {
  const files = ['StorybookProviders', 'CharacterArtwork', 'AnimationControls', 'Effects']
  const staticTest = read('tests/deployment/support/storybook-qualify.mjs')
  let count = 0
  for (const name of files) {
    const source = read(`src/test/storybook/${name}.stories.tsx`)
    const title = source.match(/title: '([^']+)'/)[1].toLowerCase().replace(/[ /]+/g, '-')
    const exports = [...source.matchAll(/export const (\w+): Story = \{/g)]
    assert.ok(exports.length)
    assert.equal([...source.matchAll(/play: async/g)].length, exports.length)
    for (const [, story] of exports) {
      const id = title + '--' + story.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
      assert.ok(staticTest.includes(`'${id}'`), id)
      count++
    }
  }
  assert.equal(count, 8)
})

test('both CI workflows require Storybook interactions and static qualification before upload', () => {
  const scripts = JSON.parse(read('package.json')).scripts
  assert.match(scripts['test:all'], /test:storybook && bun run test:storybook-static/)
  for (const path of ['reusable-build.yml']) {
    const source = read(`.github/workflows/${path}`)
    const gates = ['bun run pw:install', 'bun run test:storybook ', 'bun run test:storybook-static ', 'bun run verify:pages', 'name: Upload qualified Pages']
    for (let i = 1; i < gates.length; i++) assert.ok(source.indexOf(gates[i]) > source.indexOf(gates[i-1]), `${path}: ${gates[i]}`)
    assert.doesNotMatch(source, /continue-on-error/)
  }
})


test('speaking character handlers target the current bubble and compiled qualification waits for play plus real hover', () => {
  for (const name of ['Crunch', 'Blimp']) {
    const character = read(`src/components/Characters/${name}/${name}.tsx`)
    assert.doesNotMatch(character, /addEventListener|removeEventListener/)
    assert.match(character, /key="speaking-bubble"[^>]*ref=\{speakingBubble\}/)
    assert.match(character, /speakingBubble\.current\.style\.display = getSpeakingBubbleVisibleDisplay\(\)/)
    for (const event of ['MouseEnter', 'MouseLeave', 'TouchStart', 'TouchEnd', 'TouchCancel']) {
      assert.match(character, new RegExp(`on${event}=\\{(?:show|hide)SpeakingBubble\\}`))
    }
  }
  const control = read('src/components/Characters/CharacterImageControl/CharacterImageControl.tsx')
  assert.equal([...control.matchAll(/\{\.\.\.speakingHandlers\}/g)].length, 2)
  const story = read('src/test/storybook/CharacterArtwork.stories.tsx')
  assert.match(story, /relatedTarget: type === 'mouseout' \? region : null/)
  assert.match(story, /touch\('touchcancel'\)[\s\S]*not\.toBeVisible\(\)[\s\S]*setAttribute\('data-webblocks-speaking-play', 'passed'\)/)
  const qualifier = read('tests/deployment/support/storybook-qualify.mjs')
  assert.match(qualifier, /data-webblocks-speaking-play="passed"/)
  assert.match(qualifier, /await image\.hover\(\)[\s\S]*state: 'visible'[\s\S]*region\.hover[\s\S]*state: 'hidden'/)
  assert.equal([...qualifier.matchAll(/await qualifySpeakingStory\(page, marker\)/g)].length, 2)
  assert.match(qualifier, /assert\.deepEqual\(report\.errors, \[\]\)/)
})

test('compiled Storybook waits for every play function and its assets before navigation and reload', () => {
  for (const name of ['StorybookProviders', 'CharacterArtwork', 'AnimationControls', 'Effects']) {
    const source = read(`src/test/storybook/${name}.stories.tsx`)
    const plays = [...source.matchAll(/play: async[^]*?\n  },\n}/g)]
    assert.ok(plays.length)
    for (const [play] of plays) {
      assert.match(play, /canvasElement.removeAttribute\('data-webblocks-play-complete'\)/)
      assert.match(play, /canvasElement.setAttribute\('data-webblocks-play-complete', 'passed'\)\s*},\n}/)
    }
  }
  const qualifier = read('tests/deployment/support/storybook-qualify.mjs')
  assert.match(qualifier, /data-webblocks-play-complete="passed"/)
  assert.equal([...qualifier.matchAll(/await finishPlay\(page, id\)/g)].length, 2)
  assert.equal([...qualifier.matchAll(/await finishPlay\(page.frameLocator/g)].length, 2)
  assert.match(qualifier, /await waitForRenderedAssets\(page\)\s*await settle\(\)\s*phase = `\$\{id\} reload`\s*assert.equal\(\(await page.reload\(\)\)/)
})


test('compiled Storybook waits for the final lifecycle event and a successful accessibility result, not just play', async () => {
  const id = 'project-test-providers--default'
  const valid = { storyId: id, status: 'success', reporters: [{ type: 'a11y', status: 'passed' }] }
  assert.doesNotThrow(() => assertStoryCompletion(valid, id))
  for (const invalid of [null, { ...valid, storyId: 'wrong-story' }, { ...valid, status: 'error' },
    { ...valid, reporters: [] }, { ...valid, reporters: [{ type: 'a11y', status: 'warning' }] },
    { ...valid, reporters: [{ type: 'a11y', status: 'failed', violations: ['color-contrast'] }] },
    { ...valid, reporters: [...valid.reporters, { type: 'other', status: 'failed' }] }]) {
    assert.throws(() => assertStoryCompletion(invalid, id))
  }
  let eventCompleted = false
  let release
  const completion = new Promise(resolve => { release = resolve })
  const target = { locator: selector => {
    assert.equal(selector, `html[data-webblocks-story-finished="${id}"]`)
    return { waitFor: async options => { assert.equal(options.timeout, 30000); await completion; eventCompleted = true },
      getAttribute: async attribute => { assert.equal(attribute, 'data-webblocks-story-result'); assert.ok(eventCompleted); return JSON.stringify(valid) } }
  } }
  const waiting = waitForStoryCompletion(target, id)
  await Promise.resolve()
  assert.equal(eventCompleted, false)
  release()
  await waiting
  const preview = read('.storybook/preview.tsx')
  assert.match(preview, /beforeEach: \(\{ id, viewMode \}\)/)
  assert.match(preview, /channel.on\(STORY_FINISHED, finished\)/)
  assert.match(preview, /payload.storyId !== id/)
  assert.match(preview, /channel.off\(STORY_FINISHED, finished\)/)
  assert.match(preview, /a11y: \{ test: 'error' \}/)
  const qualifier = read('tests/deployment/support/storybook-qualify.mjs')
  assert.match(qualifier, /await waitForStoryCompletion\(target, id\)[\s\S]*await target.locator\('\[data-webblocks-play-complete="passed"\]'\)/)
  assert.equal([...qualifier.matchAll(/await settle\(\)/g)].length, 4)
})

test('Storybook navigation waits for delayed module requests and preserves their starting phase', async () => {
  const page = new EventEmitter()
  let phase = 'provider story initial load'
  const request = { url: () => 'http://localhost/storybook/assets/axe.js' }
  const external = { url: () => 'https://example.invalid/asset.js' }
  const observed = []
  page.on('requestfailed', value => observed.push(requests.phaseFor(value)))
  const requests = trackStorybookRequests(page, 'http://localhost', () => phase)
  page.emit('request', request)
  page.emit('request', external)
  phase = 'later phase'
  assert.equal(requests.phaseFor(request), 'provider story initial load')
  assert.equal(requests.phaseFor(external), undefined)
  await assert.rejects(requests.wait({ quietMs: 1, timeoutMs: 5 }), /axe.js/)
  let settled = false
  const wait = requests.wait({ quietMs: 1, timeoutMs: 1000 }).then(() => { settled = true })
  await Promise.resolve()
  assert.equal(settled, false)
  page.emit('requestfinished', request)
  await wait
  assert.equal(settled, true)
  page.emit('request', request)
  phase = 'closing'
  page.emit('requestfailed', request)
  assert.deepEqual(observed, ['later phase'])
  await requests.wait({ quietMs: 1, timeoutMs: 1000 })
  const qualifier = read('tests/deployment/support/storybook-qualify.mjs')
  assert.match(qualifier, /!isNavigationCancellation\(request\).*report.errors.push/)
  assert.match(qualifier, /await requests.wait\(\)\s*assert.deepEqual\(report.errors, \[\]\)/)
})


test('Storybook manager ships a cancellable idle callback fallback and preserves native APIs', () => {
  const html = read('.storybook/manager-head.html')
  const script = html.match(/<script id="webblocks-idle-compat">([\s\S]*?)<\/script>/)?.[1]
  assert.ok(script)
  const nativeRequest = () => 99
  const nativeCancel = () => {}
  const native = { requestIdleCallback: nativeRequest, cancelIdleCallback: nativeCancel }
  runInNewContext(script, { window: native })
  assert.equal(native.requestIdleCallback, nativeRequest)
  assert.equal(native.cancelIdleCallback, nativeCancel)

  for (const partialNative of [false, true]) {
    let now = 100, next = 0
    const pending = new Map()
    const scope = {
      ...(partialNative ? { requestIdleCallback: nativeRequest } : {}),
      performance: { now: () => now },
      setTimeout: callback => { pending.set(++next, callback); return next },
      clearTimeout: handle => pending.delete(handle),
    }
    runInNewContext(script, { window: scope })
    assert.equal(typeof scope.cancelIdleCallback, 'function')
    let result
    const canceled = scope.requestIdleCallback(() => assert.fail('Canceled callback ran'))
    scope.cancelIdleCallback(canceled)
    assert.equal(pending.has(canceled), false)
    const handle = scope.requestIdleCallback(deadline => { result = deadline })
    assert.equal(result, undefined, 'Idle callback must not execute synchronously')
    now = 102
    pending.get(handle)()
    assert.equal(result.didTimeout, false)
    assert.equal(result.timeRemaining(), 16)
    now += 20
    assert.equal(result.timeRemaining(), 0)
    const expired = scope.requestIdleCallback(deadline => { result = deadline }, { timeout: 1 })
    now += 2
    pending.get(expired)()
    assert.equal(result.didTimeout, true)
    assert.equal(result.timeRemaining(), 0)
    assert.throws(() => scope.requestIdleCallback(null), /Expected an idle callback/)
  }
  assert.ok(JSON.parse(read('site/template-files.json')).includes('.storybook/manager-head.html'))
  const qualifier = read('tests/deployment/support/storybook-qualify.mjs')
  assert.match(qualifier, /head script#webblocks-idle-compat/)
  assert.equal([...qualifier.matchAll(/await checkManagerCompatibility\(\)/g)].length, 2)
  assert.doesNotMatch(qualifier, /addInitScript/)
})

test('provider play waits for deferred router and Redux commits without replaying clicks or marking failures complete', async () => {
  const story = read('src/test/storybook/StorybookProviders.stories.tsx')
  const body = story.match(/play: async \(\{ canvas, userEvent, canvasElement \}\) => \{([\s\S]*?)\n  },\n}/)?.[1]
  assert.ok(body)
  for (const blocked of [null, '/apps', 'Mobile App']) {
    const visible = new Set(['Homepage', '/storybook/provider-harness'])
    let complete = false
    const clicks = []
    const context = {
      canvas: {
        getByRole: (role, { name }) => ({ role, name }),
        getByText: (name, options) => {
          assert.equal(options.exact, true)
          assert.ok(visible.has(name), `Text not yet committed: ${name}`)
          return { name }
        },
        findByText: async (name, options, timing) => {
          assert.equal(options.exact, true)
          assert.equal(timing.timeout, 5000)
          assert.equal(visible.has(name), false, 'The click has not committed yet')
          await Promise.resolve()
          if (blocked === name) throw new Error(`Navigation or state change did not complete: ${name}`)
          visible.add(name)
          return { name }
        },
      },
      userEvent: { click: async target => { clicks.push(target.name) } },
      canvasElement: {
        removeAttribute: key => { assert.equal(key, 'data-webblocks-play-complete'); complete = false },
        setAttribute: (key, value) => { assert.equal(key, 'data-webblocks-play-complete'); assert.equal(value, 'passed'); complete = true },
      },
      expect: value => ({
        toBeVisible: async () => assert.ok(value),
        toHaveAttribute: async (key, expected) => { assert.equal(key, 'href'); assert.equal(expected, '/apps') },
      }),
    }
    const playing = runInNewContext(`(async () => {${body}})()`, context)
    if (blocked) await assert.rejects(playing, /did not complete/)
    else await playing
    assert.equal(complete, blocked === null)
    assert.deepEqual(clicks, blocked === '/apps' ? ['Mobile apps route'] : ['Mobile apps route', 'Switch roster page'])
  }
  const controls = read('src/test/storybook/AnimationControls.stories.tsx')
  for (const label of ['Editor open', 'Editor closed']) {
    assert.ok(controls.includes(`await canvas.findByText('${label}', { exact: true }, { timeout: 5000 })`))
  }
})
