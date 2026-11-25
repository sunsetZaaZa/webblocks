import assert from 'node:assert/strict'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { createBuildFixture } from './support/build-fixture.mjs'
import { chromium } from 'playwright'
import { build } from 'vite'
import { serveStatic } from './support/static-host.mjs'
import { LEGACY_KEY, storageKey } from '../../src/state-management/persistence.mjs'

const project = fileURLToPath(new URL('../../', import.meta.url))

test('two deployed Pages sites isolate editor state, import/export and published defaults', { timeout: 180000 }, async t => {
  const root = createBuildFixture('webblocks-persistence-')
  const keys = ['WEBBLOCKS_DEPLOYMENT', 'WEBBLOCKS_BASE_PATH', 'GITHUB_REPOSITORY', 'WEBBLOCKS_CONFIG_FILE']
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]))
  t.after(async () => {
    for (const key of keys) if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]
    await rm(root, { recursive: true, force: true })
  })
  const configFile = resolve(root, 'site.json')
  await writeFile(configFile, '{}')
  const defaultsPath = resolve(root, 'webblocks.defaults.json')
  const defaults = {
    format: 'webblocks-editor-config', schemaVersion: 1, siteId: 'github:owner/a',
    data: {
      characterTracker: Array.from({ length: 8 }, (_, i) => ({ page: i + 1, chars: i ? [] : [{ identifier: 'published', type: 1, attributes: [0], orientation: 0, currentX: 20, currentY: 50, toRender: true, sizes: { width: 48, height: 48 } }] })),
      menuFields: { targetFPS: 44, showFPS: false, runLength: 10, nonStop: false }, settingsFields: { juggleAnimationBounding: false },
    },
  }
  for (const name of ['a', 'b']) {
    if (name === 'a') await writeFile(defaultsPath, JSON.stringify(defaults))
    else await rm(defaultsPath)
    Object.assign(process.env, { WEBBLOCKS_DEPLOYMENT: 'github-pages', WEBBLOCKS_BASE_PATH: `/${name}/`, GITHUB_REPOSITORY: `owner/${name}`, WEBBLOCKS_CONFIG_FILE: configFile })
    await build({ root: project, configFile: resolve(project, 'vite.config.ts'), mode: 'github-pages', logLevel: 'silent', build: { outDir: resolve(root, name) } })
  }
  const server = await serveStatic(['a', 'b'].map(name => ({ directory: resolve(root, name), base: `/${name}/` })))
  t.after(() => server.close())
  const origin = server.origin
  const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {})
  // Close the browser before the HTTP server; avoid idle keepalive connections.
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    let acceptDialog = true
    page.on('dialog', dialog => acceptDialog ? dialog.accept() : dialog.dismiss())
    const aKey = storageKey('github:owner/a'), bKey = storageKey('github:owner/b')
    const read = key => page.evaluate(k => localStorage.getItem(k), key)
    const write = (key, value) => page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value])
    const visit = async name => { await page.goto(`${origin}/${name}/#/`); await page.getByText('SOME HEADER', { exact: true }).waitFor() }
    const persist = page.getByRole('checkbox', { name: 'Persist Characters' })
    const menu = async () => {
      if (!await persist.isVisible()) {
        const wrench = page.locator('button').filter({ has: page.locator('img[src$="wrench.png"]') })
        if (!await wrench.isVisible()) await page.getByRole('button', { name: 'Editor Panel' }).click()
        if (!await page.getByRole('button', { name: 'Menu', exact: true }).isVisible()) await wrench.click()
        await page.getByRole('button', { name: 'Menu', exact: true }).click()
      }
      await persist.waitFor()
    }
    await visit('a')
    await menu()
    const aDefault = JSON.parse(await read(aKey))
    assert.equal(aDefault.siteId, 'github:owner/a')
    assert.equal(aDefault.data.characterTracker[0].chars[0].identifier, 'published')
    assert.equal(aDefault.data.menuFields.targetFPS, 44)
    const legacy = JSON.stringify({ animation: JSON.stringify({ ...aDefault.data, characterTracker: aDefault.data.characterTracker.map(entry => ({ ...entry, chars: [] })) }) })
    await write(LEGACY_KEY, legacy)
    await page.reload(); await menu()
    assert.equal(JSON.parse(await read(aKey)).data.characterTracker[0].chars.length, aDefault.data.characterTracker[0].chars.length)
    await page.getByRole('button', { name: 'Import Legacy Character Sheet' }).click()
    assert.equal(JSON.parse(await read(aKey)).data.characterTracker[0].chars.length, 0)
    await page.reload(); await menu()
    assert.equal(JSON.parse(await read(aKey)).data.characterTracker[0].chars.length, 0)
    await visit('b'); await menu()
    const bDefault = await read(bKey)
    assert.ok(JSON.parse(bDefault).data.characterTracker[0].chars.length > 0)
    await visit('a'); await menu()
    await persist.uncheck()
    assert.deepEqual(JSON.parse(await read(aKey)), { version: 1, siteId: 'github:owner/a', enabled: false })
    await page.reload(); await menu()
    assert.equal(await persist.isChecked(), false)
    await persist.check()
    assert.equal(JSON.parse(await read(aKey)).enabled, true)
    await page.getByRole('button', { name: 'Reset Character Sheet' }).click()
    assert.ok(JSON.parse(await read(aKey)).data.characterTracker[0].chars.length > 0)
    await page.getByRole('button', { name: 'Clear Character Sheet' }).click()
    assert.equal(await read(aKey), null)
    assert.equal(await read(bKey), bDefault)
    assert.equal(await read(LEGACY_KEY), legacy)
    await write(aKey, '{corrupt')
    await page.reload(); await menu()
    await page.getByRole('status').filter({ hasText: 'protected' }).waitFor()
    assert.equal(await read(aKey), '{corrupt')
    await page.getByRole('button', { name: 'Clear Character Sheet' }).click()
    assert.equal(await read(aKey), null)
    assert.equal(await read(bKey), bDefault)
    // Export from the published defaults after clear, then import an edited copy.
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export Website Configuration' }).click()
    const download = await downloadPromise
    assert.equal(download.suggestedFilename(), 'webblocks.defaults.json')
    const exported = JSON.parse(await readFile(await download.path(), 'utf8'))
    assert.equal(exported.siteId, 'github:owner/a')
    assert.equal(exported.data.characterTracker[0].chars[0].identifier, 'published')
    assert.equal(Object.hasOwn(exported.data.menuFields, 'presistCharacters'), false)
    const upload = raw => page.getByLabel('Website configuration file').setInputFiles({ name: 'webblocks.defaults.json', mimeType: 'application/json', buffer: Buffer.from(raw) })
    exported.data.menuFields.targetFPS = 65
    const raw = JSON.stringify(exported)
    acceptDialog = false
    await upload(raw)
    await page.getByRole('status').filter({ hasText: 'Import canceled' }).waitFor()
    assert.equal(await read(aKey), null)
    acceptDialog = true
    await upload(raw)
    await page.getByRole('status').filter({ hasText: 'imported and saved' }).waitFor()
    assert.equal(JSON.parse(await read(aKey)).data.menuFields.targetFPS, 65)
    await page.reload(); await menu()
    assert.equal(JSON.parse(await read(aKey)).data.menuFields.targetFPS, 65)
    await visit('b'); await menu()
    const beforeForeign = await read(bKey)
    await upload(raw)
    await page.getByRole('status').filter({ hasText: 'belongs to github:owner/a' }).waitFor()
    assert.equal(await read(bKey), beforeForeign)
    await upload('{bad')
    await page.getByRole('status').filter({ hasText: 'not valid JSON' }).waitFor()
    assert.equal(await read(bKey), beforeForeign)
    assert.deepEqual(errors, [])
    await context.close()
  } finally { await browser.close() }
})
