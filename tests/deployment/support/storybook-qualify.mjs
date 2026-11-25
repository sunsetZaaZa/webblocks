import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import { inventory, serveStatic } from './static-host.mjs'
import { launchEngine, contextOptions, isNavigationCancellation, waitForRenderedAssets } from './browser-profiles.mjs'
import { normalizeBasePath } from '../../../config/deployment.mjs'

export const stories = {
  'project-test-providers--default': 'Storybook provider harness',
  'characters-artwork--orientations': 'Character orientations',
  'characters-artwork--speaking-character': 'Speaking character',
  'characters-artwork--interactive-character': null,
  'editor-animation-controls--editor-toggle': 'Editor toggle story',
  'editor-animation-controls--playback-artwork': 'Playback controls',
  'effects-backgrounds--image-particles': 'Image particles',
  'effects-backgrounds--squares': 'Falling squares',
}

// The play marker is necessary but not sufficient: Storybook runs asynchronous
// afterEach hooks (including axe) afterwards. Fail on missing/failed reports.
export function assertStoryCompletion(result, id) {
  assert.equal(result?.storyId, id, 'Storybook completion belongs to a different story')
  assert.ok(Array.isArray(result.reporters), `Missing Storybook lifecycle reports: ${id}`)
  const detail = JSON.stringify(result.reporters)
  assert.equal(result.status, 'success', `Storybook lifecycle failed: ${id}: ${detail}`)
  assert.ok(result.reporters.every(report => report.status !== 'failed'), `Storybook reporter failed: ${id}: ${detail}`)
  const a11y = result.reporters.filter(report => report.type === 'a11y')
  assert.ok(a11y.length > 0 && a11y.every(report => report.status === 'passed'), `Successful Storybook accessibility report required: ${id}: ${detail}`)
}

export async function waitForStoryCompletion(target, id) {
  const marker = target.locator(`html[data-webblocks-story-finished="${id}"]`)
  await marker.waitFor({ state: 'attached', timeout: 30000 })
  assertStoryCompletion(JSON.parse(await marker.getAttribute('data-webblocks-story-result')), id)
}

// Track local requests from their start, not just DOM assets. Manager/addon
// modules can still be loading after the play function and asset checks.
export function trackStorybookRequests(page, origin, getPhase) {
  const pending = new Map()
  let lastActivity = performance.now()
  page.on('request', request => {
    if (new URL(request.url()).origin !== origin) return
    pending.set(request, getPhase())
    lastActivity = performance.now()
  })
  const finish = request => {
    if (pending.delete(request)) lastActivity = performance.now()
  }
  page.on('requestfinished', finish)
  // The separate error collector must run before this removes the start phase.
  page.on('requestfailed', finish)
  return {
    phaseFor: request => pending.get(request),
    async wait({ quietMs = 250, timeoutMs = 15000 } = {}) {
      const deadline = performance.now() + timeoutMs
      while (pending.size || performance.now() - lastActivity < quietMs) {
        if (performance.now() >= deadline) {
          throw new Error('Storybook requests did not settle: ' + [...pending.keys()].map(request => request.url()).join(', '))
        }
        await delay(Math.min(25, quietMs || 1))
      }
    },
  }
}

// Wait for the compiled play function to finish before reloading or navigating.
// Separately verify real browser pointer movement rather than relying only on
// synthetic DOM events inside the story. Run this on both loads of the story.
async function qualifySpeakingStory(page, region) {
  await page.locator('[data-webblocks-speaking-play="passed"]').waitFor({ state: 'attached' })
  const image = region.getByRole('img', { name: 'Crunch character', exact: true })
  const bubble = region.getByText('Storybook wiring is alive and politely caffeinated.', { exact: true })
  await bubble.waitFor({ state: 'attached' })
  // The fixture is 320 x 160; this point is outside the character and bubble.
  await region.hover({ position: { x: 260, y: 120 } })
  await bubble.waitFor({ state: 'hidden' })
  await image.hover()
  await bubble.waitFor({ state: 'visible' })
  await region.hover({ position: { x: 260, y: 120 } })
  await bubble.waitFor({ state: 'hidden' })
}

// Run the same story coverage for standalone builds and the final combined Pages artifact.
export async function qualifyStorybook({ directory, base, publicDir = 'public', mountDirectory = directory, mountBase = base, browser: suppliedBrowser, browserProfile }) {
  base = normalizeBasePath(base)
  const report = { base, passed: false, stories: [], errors: [] }
  let host, context, browser = suppliedBrowser
  let phase = 'artifact inventory'
  try {
    const files = await inventory(directory)
    for (const entry of ['index.html', 'iframe.html', 'index.json']) assert.ok(files.has(entry), `Missing ${entry}`)
    const publicFiles = await inventory(publicDir)
    for (const [name, path] of publicFiles) {
      assert.ok(files.has(name), `Missing copied artwork ${name}`)
      assert.deepEqual(await readFile(files.get(name)), await readFile(path))
    }
    assert.ok([...files.keys()].some(name => /\.(otf|ttf|woff2?)$/i.test(name) && /Chakra/i.test(name)), 'Expected compiled ChakraPetch font')
    const index = JSON.parse(await readFile(files.get('index.json'), 'utf8'))
    for (const id of Object.keys(stories)) assert.equal(index.entries[id]?.type, 'story', `Missing story ${id}`)
    host = await serveStatic([{ directory: mountDirectory, base: mountBase }])
    if (!browser) {
      browser = await launchEngine(browserProfile?.engine ?? 'chromium')
    }
    context = await browser.newContext(contextOptions(browserProfile))
    const page = await context.newPage()
    page.setDefaultTimeout(15000)
    page.on('pageerror', error => report.errors.push(`[${phase}] ${error.message}`))
    page.on('console', message => { if (message.type() === 'error') report.errors.push(`Console error [${phase}]: ${message.text()}`) })
    page.on('response', response => {
      const url = new URL(response.url())
      if (url.origin === host.origin && (response.status() >= 400 || !url.pathname.startsWith(base))) report.errors.push(`${response.status()} ${url.pathname}`)
    })
    page.on('requestfailed', request => {
      if (new URL(request.url()).origin === host.origin && !isNavigationCancellation(request)) report.errors.push(`Request failed [${requests.phaseFor(request) ?? phase}]: ${request.url()} (${request.failure()?.errorText})`)
    })
    const requests = trackStorybookRequests(page, host.origin, () => phase)
    const settle = async () => {
      await requests.wait()
      assert.deepEqual(report.errors, [])
    }
    const checkManagerCompatibility = async () => {
      // Verify the deployed head, not an injected Playwright compatibility shim.
      await page.locator('head script#webblocks-idle-compat').waitFor({ state: 'attached' })
      assert.equal(await page.evaluate(() => typeof window.requestIdleCallback === 'function' &&
        typeof window.cancelIdleCallback === 'function'), true, 'Storybook manager idle scheduling is unavailable')
    }
    const finishPlay = async (target, id) => {
      await waitForStoryCompletion(target, id)
      await target.locator('[data-webblocks-play-complete="passed"]').waitFor({ state: 'attached' })
      await waitForRenderedAssets(target)
    }
    phase = 'manager initial load'
    // Exercise the manager and its embedded iframe before standalone stories.
    assert.equal((await page.goto(host.origin + base + '?path=/story/characters-artwork--orientations')).status(), 200)
    await checkManagerCompatibility()
    await page.frameLocator('#storybook-preview-iframe').getByRole('region', { name: 'Character orientations' }).waitFor()
    await finishPlay(page.frameLocator('#storybook-preview-iframe'), 'characters-artwork--orientations')
    await waitForRenderedAssets(page)
    await settle()
    phase = 'manager reload'
    assert.equal((await page.reload()).status(), 200)
    await checkManagerCompatibility()
    await page.frameLocator('#storybook-preview-iframe').getByRole('region', { name: 'Character orientations' }).waitFor()
    await finishPlay(page.frameLocator('#storybook-preview-iframe'), 'characters-artwork--orientations')
    await waitForRenderedAssets(page)
    await settle()
    // Check every directly linked story, with the real compiled preview assets.
    for (const [id, region] of Object.entries(stories)) {
      phase = `${id} initial load`
      assert.equal((await page.goto(host.origin + base + `iframe.html?id=${id}&viewMode=story`)).status(), 200)
      const marker = region ? page.getByRole('region', { name: region }) : page.getByRole('button', { name: 'Crunch character' })
      await marker.waitFor({ state: 'attached' })
      await finishPlay(page, id)
      if (id === 'characters-artwork--speaking-character') await qualifySpeakingStory(page, marker)
      await waitForRenderedAssets(page)
      await settle()
      phase = `${id} reload`
      assert.equal((await page.reload()).status(), 200)
      await marker.waitFor({ state: 'attached' })
      await finishPlay(page, id)
      if (id === 'characters-artwork--speaking-character') await qualifySpeakingStory(page, marker)
      await page.evaluate(async () => {
        const fonts = await document.fonts.load('16px ChakraPetch')
        if (!fonts.length || fonts.some(font => font.status !== 'loaded')) throw new Error('ChakraPetch font failed to load')
        await Promise.all([...document.querySelectorAll('#storybook-root img')].map(image => image.decode()))
      })
      if (id === 'effects-backgrounds--image-particles') {
        const background = await page.locator('.webfall__item--image').first().evaluate(el => el.style.backgroundImage)
        assert.ok(background.includes(base + 'duck.png'), background)
        assert.equal((await fetch(host.origin + base + 'duck.png')).status, 200)
      }
      await waitForRenderedAssets(page)
      await settle()
      report.stories.push(id)
    }
    assert.equal((await fetch(host.origin + base + 'missing-wgp11.png')).status, 404)
    assert.deepEqual(report.errors, [])
    report.passed = true
  } catch (error) { report.errors.push(`[${phase}] ${error.stack ?? String(error)}`) }
  finally {
    try { await context?.close() } finally {
      try { if (!suppliedBrowser) await browser?.close() } finally { await host?.close() }
    }
  }
  if (report.errors.length) report.passed = false
  return report
}
