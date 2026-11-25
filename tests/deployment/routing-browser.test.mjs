import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, rm, stat, writeFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { createBuildFixture } from './support/build-fixture.mjs'
import { chromium } from 'playwright'
import { build } from 'vite'
import { serveStatic } from './support/static-host.mjs'
import { routes, routeAliases } from '../../src/routing/routes.mjs'

const project = fileURLToPath(new URL('../../', import.meta.url))
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.otf': 'font/otf' }
const markers = {
  home: 'SOME HEADER', apps: 'app name', application: 'Current Version: 0.0.0',
  about: 'Template Key', privacy: 'UserPrivacy', libraries: 'Uses Router Link', softwarePackage: 'SECTION 1',
}

// Static-only HTTP server for Pages. Browser-routing profiles get an explicit
// HTML fallback, like NGINX, but never for assets. Pages uses the shared strict host.
async function serve(out, base, profile) {
  if (profile === 'github-pages') return serveStatic([{ directory: out, base }])
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
      if (!pathname.startsWith(base)) { res.writeHead(404).end(); return }
      const relative = pathname.slice(base.length)
      let file = resolve(out, relative || 'index.html')
      if (!file.startsWith(out + sep)) { res.writeHead(404).end(); return }
      const exists = await stat(file).then(s => s.isFile(), () => false)
      if (!exists && !extname(relative) && !/^(assets|characters|controller|gen_util)(\/|$)/.test(relative)) file = resolve(out, 'index.html')
      const content = await readFile(file)
      res.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream' }).end(content)
    } catch { res.writeHead(404).end() }
  })
  await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done) })
  return { origin: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(done => server.close(done)) }
}

test('production application routing in Chromium', { timeout: 420000 }, async t => {
  const root = createBuildFixture('webblocks-routing-')
  const keys = ['WEBBLOCKS_DEPLOYMENT', 'WEBBLOCKS_BASE_PATH', 'GITHUB_REPOSITORY', 'WEBBLOCKS_CONFIG_FILE']
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]))
  t.after(async () => {
    for (const key of keys) if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]
    await rm(root, { recursive: true, force: true })
  })
  const sitePath = resolve(root, 'webblocks.config.json')
  process.env.WEBBLOCKS_CONFIG_FILE = sitePath
  await writeFile(sitePath, '{}')
  const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {})
  t.after(() => browser.close())
  const cases = [
    { profile: 'github-pages', mode: 'github-pages', base: '/project/' },
    { profile: 'github-pages', mode: 'github-pages', base: '/' },
    { profile: 'local', mode: 'production', base: '/docs/site/' },
    { profile: 'docker', mode: 'docker', base: '/' },
  ]
  for (const [i, entry] of cases.entries()) {
    await t.test(`${entry.profile} at ${entry.base}`, { timeout: 60000 }, async sub => {
      Object.assign(process.env, { WEBBLOCKS_DEPLOYMENT: entry.profile, WEBBLOCKS_BASE_PATH: entry.base, GITHUB_REPOSITORY: 'owner/project' })
      const out = resolve(root, `dist-${i}`)
      await build({ root: project, configFile: resolve(project, 'vite.config.ts'), mode: entry.mode, logLevel: 'silent', build: { outDir: out } })
      const server = await serve(out, entry.base, entry.profile)
      let context
      sub.after(async () => { await context?.close(); await server.close() })
      context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      const url = path => server.origin + entry.base + (entry.profile === 'github-pages' ? '#' + path : path.slice(1))
      const expectPage = async key => { await page.getByText(markers[key], { exact: true }).first().waitFor({ state: 'attached' }) }
      for (const [key, path] of Object.entries(routes)) {
        const response = await page.goto(url(path))
        if (response) assert.equal(response.status(), 200)
        await expectPage(key)
        assert.equal((await page.reload()).status(), 200)
        await expectPage(key)
      }
      for (const [from, to] of Object.entries(routeAliases)) {
        const suffix = '?source=legacy#section'
        await page.goto(url(from + suffix))
        await page.waitForURL(url(to + suffix))
        await expectPage(Object.keys(routes).find(key => routes[key] === to))
      }
      await page.goto(url(routes.home))
      await page.getByRole('link', { name: 'apps', exact: true }).click()
      await page.waitForURL(url(routes.apps))
      await page.getByRole('link', { name: 'app name', exact: true }).click()
      await page.waitForURL(url(routes.application))
      await page.goBack()
      await page.waitForURL(url(routes.apps))
      await expectPage('apps')
      await page.goForward()
      await page.waitForURL(url(routes.application))
      await expectPage('application')
      await page.locator('.applicationPrivacyNotice').getByRole('link', { name: 'User Privacy', exact: true }).click()
      await page.waitForURL(url(routes.privacy))
      await page.getByRole('link', { name: 'software libraries', exact: true }).click()
      await page.waitForURL(url(routes.libraries))
      await page.getByRole('link', { name: 'package', exact: true }).click()
      await page.waitForURL(url(routes.softwarePackage))
      await page.goto(url('/unknown'))
      await page.getByRole('heading', { name: 'Page not found' }).waitFor()
      await page.getByRole('link', { name: 'Return to homepage' }).click()
      await page.waitForURL(url(routes.home))
      await expectPage('home')
      if (entry.profile === 'github-pages') assert.equal((await fetch(server.origin + entry.base + 'apps/application')).status, 404)
      assert.equal((await fetch(server.origin + entry.base + 'assets/missing.js')).status, 404)
      assert.deepEqual(errors, [])
    })
  }
  // Real app feature-gate checks, independent of the routing fixtures above.
  const featureCases = [
    { name: 'public viewer', editor: false, characters: true, effects: true, animations: true },
    { name: 'no characters or effects', editor: true, characters: false, effects: false, animations: true },
    { name: 'static motion', editor: true, characters: true, effects: true, animations: false },
  ]
  for (const [i, flags] of featureCases.entries()) {
    await t.test(`site configuration: ${flags.name}`, { timeout: 60000 }, async sub => {
      await writeFile(sitePath, JSON.stringify({
        site: { title: 'Configured & site', description: 'Independent repository', language: 'fr-CA' },
        editor: { enabled: flags.editor },
        features: { characters: flags.characters, effects: flags.effects, animations: flags.animations },
      }))
      Object.assign(process.env, { WEBBLOCKS_DEPLOYMENT: 'github-pages', WEBBLOCKS_BASE_PATH: '/project/', GITHUB_REPOSITORY: 'owner/project' })
      const out = resolve(root, `features-${i}`)
      await build({ root: project, configFile: resolve(project, 'vite.config.ts'), mode: 'github-pages', logLevel: 'silent', build: { outDir: out } })
      const server = await serve(out, '/project/', 'github-pages')
      let context
      sub.after(async () => { await context?.close(); await server.close() })
      context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(server.origin + '/project/#/')
      await page.getByText(markers.home, { exact: true }).waitFor()
      assert.equal(await page.title(), 'Configured & site')
      assert.equal(await page.locator('html').getAttribute('lang'), 'fr-CA')
      assert.equal(await page.locator('meta[name="description"]').getAttribute('content'), 'Independent repository')
      const toggle = page.getByRole('button', { name: 'Editor Panel' })
      assert.equal(await toggle.count(), Number(flags.editor))
      const character = page.locator('img[alt="Blimp character"], img[alt="Crunch character"]')
      assert.equal((await character.count()) > 0, flags.characters)
      assert.equal(await page.locator('.falling-squares').count(), Number(flags.effects))
      if (flags.editor) {
        await toggle.click()
        assert.equal(await page.locator('img[src$="game_controller.png"]').count(), Number(flags.animations))
        await page.locator('button').filter({ has: page.locator('img[src$="wrench.png"]') }).click()
        // The menu also contains Clear/Reset Character Sheet buttons. Match
        // the full accessible name so those distinct actions cannot satisfy the gate.
        const sheet = page.getByRole('button', { name: 'Character Sheet', exact: true })
        assert.equal(await sheet.count(), Number(flags.characters))
        for (const name of ['Clear Character Sheet', 'Reset Character Sheet']) {
          assert.equal(await page.getByRole('button', { name, exact: true }).count(), Number(flags.characters))
        }
        if (flags.characters) {
          await sheet.click()
          await page.getByText('Templates', { exact: true }).waitFor({ state: 'visible' })
        }
      }
      if (!flags.animations) {
        const square = page.locator('.falling-squares__item').first()
        assert.equal(await square.evaluate(el => getComputedStyle(el).animationPlayState), 'paused')
        await page.mouse.move(400, 300)
        assert.equal(await page.locator('.falling-squares').evaluate(el => getComputedStyle(el).getPropertyValue('--parallax-x').trim()), '0px')
      }
      assert.deepEqual(errors, [])
    })
  }

})
