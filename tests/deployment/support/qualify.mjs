import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { routes, routeAliases } from '../../../src/routing/routes.mjs'
import { decodeEditorConfig } from '../../../src/state-management/editor-config.mjs'
import { inspectArtifact } from './artifact.mjs'
import { serveStatic } from './static-host.mjs'

import { defaultContent } from '../../../site/default-content.mjs'

export function contentMarkers(content) {
  const p = content.pages
  return { home: p.home.heading, apps: p.apps.name, application: `${p.application.versionLabel} ${p.application.version}`,
    about: p.about.key, privacy: p.privacy.heading, libraries: p.libraries.detailLabel, softwarePackage: p.softwarePackage.section1 }
}

// Qualify the exact artifact, not a Vite dev/preview server. Errors are returned
// in the report so CI retains useful diagnostics even when qualification fails.
export async function qualifyArtifact(options) {
  const result = { base: options.base, passed: false, artifact: null, browser: null, errors: [] }
  let host, browser, context
  try {
    result.artifact = await inspectArtifact(options)
    result.base = result.artifact.base
    if (!result.artifact.passed) { result.errors.push(...result.artifact.errors); return result }
    if (options.artifactOnly) { result.browser = { status: 'not-run' }; result.passed = true; return result }
    const base = result.base
    host = await serveStatic([{ directory: options.directory, base }])
    const { launchEngine, contextOptions, isNavigationCancellation, waitForRenderedAssets } = await import('./browser-profiles.mjs')
    browser = await launchEngine(options.browserProfile?.engine ?? 'chromium')
    context = await browser.newContext(contextOptions(options.browserProfile))
    const page = await context.newPage()
    page.setDefaultTimeout(15000)
    page.setDefaultNavigationTimeout(20000)
    const errors = result.errors
    let phase = 'initial navigation'
    const completed = []
    result.browser = { status: 'running', routes: completed, aliases: [], internalLinks: 0, localResponses: 0, externalRequests: [], publishedDefaults: 'not-requested' }
    const report = result.browser
    page.on('pageerror', e => errors.push(`Uncaught page error: ${e.message}`))
    page.on('console', message => { if (message.type() === 'error') errors.push(`Console error: ${message.text()}`) })
    page.on('response', response => {
      const url = new URL(response.url())
      if (url.origin !== host.origin) return
      report.localResponses++
      if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${url.pathname}`)
      if (!url.pathname.startsWith(base)) errors.push(`Request outside deployment base: ${url.pathname}`)
    })
    page.on('requestfailed', request => {
      if (isNavigationCancellation(request)) return // ordinary navigation cancellation
      errors.push(`Request failed [${phase}]: ${request.url()} (${request.failure()?.errorText})`)
    })
    page.on('request', request => {
      const url = new URL(request.url())
      if (['http:', 'https:'].includes(url.protocol) && url.origin !== host.origin) report.externalRequests.push(url.href)
    })
    const urlFor = route => host.origin + base + '#' + route
    const content = options.expectedContent ?? defaultContent
    const markers = contentMarkers(content)
    const enabled = Object.entries(routes).filter(([key]) => content.enabledPages.includes(key))
    const enabledPaths = new Set(enabled.map(([, path]) => path))
    const aliases = Object.entries(routeAliases).filter(([, to]) => enabledPaths.has(to))
    const known = new Set([...enabledPaths, ...aliases.map(([from]) => from)])
    report.disabledRoutes = []
    async function inspectPage(key) {
      const shell = page.locator(`[data-webblocks-page="${key}"]`)
      await shell.getByText(markers[key], { exact: true }).first().waitFor({ state: 'attached' })
      const navigation = await shell.locator('.navGuideMover a').evaluateAll(elements => elements.map(a => ({ label: a.textContent, href: a.href })))
      assert.deepEqual(navigation, content.navigation.map(entry => ({ label: entry.label, href: urlFor(routes[entry.page]) })))
      await waitForRenderedAssets(page)
      const links = await page.locator('a[href]').evaluateAll(elements => elements.map(a => a.href))
      for (const href of links) {
        const link = new URL(href)
        if (link.origin !== host.origin) continue
        assert.equal(link.pathname, base, `Internal link escapes hash routing: ${href}`)
        const route = link.hash.slice(1).split(/[?#]/)[0] || '/'
        assert.ok(known.has(route), `Unknown internal route: ${href}`)
        report.internalLinks++
      }
    }
    for (const [key, path] of enabled) {
      phase = `route ${path}`
      const response = await page.goto(urlFor(path))
      if (response) assert.equal(response.status(), 200)
      await inspectPage(key)
      phase = `reload ${path}`
      assert.equal((await page.reload()).status(), 200)
      await inspectPage(key)
      completed.push(path)
    }
    for (const [from, to] of aliases) {
      phase = `alias ${from}`
      await page.goto(urlFor(from + '?legacy=1#section'))
      await page.waitForURL(urlFor(to + '?legacy=1#section'))
      await inspectPage(Object.keys(routes).find(key => routes[key] === to))
      report.aliases.push(from)
    }
    for (const path of [...Object.values(routes), ...Object.keys(routeAliases)].filter(path => !known.has(path))) {
      phase = `disabled route ${path}`
      await page.goto(urlFor(path))
      await page.getByRole('heading', { name: 'Page not found' }).waitFor()
      await waitForRenderedAssets(page)
      report.disabledRoutes.push(path)
    }
    phase = 'unknown route recovery'
    await page.goto(urlFor('/missing-wgp08-route'))
    await page.getByRole('heading', { name: 'Page not found' }).waitFor()
    await waitForRenderedAssets(page)
    await page.getByRole('link', { name: 'Return to homepage' }).click()
    await page.waitForURL(urlFor('/'))
    await inspectPage('home')
    // Negative HTTP probes use Node fetch, not the browser error collector.
    for (const missing of ['apps/application', 'assets/wgp08-missing.js', 'characters/wgp08-missing.png']) {
      assert.equal((await fetch(host.origin + base + missing)).status, 404, `Unexpected static fallback: ${missing}`)
    }
    if (base !== '/') assert.equal((await fetch(host.origin + '/assets/wgp08-missing.js')).status, 404)
    if (options.expectedSite) {
      const site = options.expectedSite
      assert.equal(await page.title(), site.title)
      assert.equal(await page.locator('html').getAttribute('lang'), site.language)
      assert.equal(await page.locator('meta[name="description"]').getAttribute('content'), site.description)
    }
    if (options.expectedDefaults) {
      phase = 'published defaults'
      const { siteId, path } = options.expectedDefaults
      const expected = decodeEditorConfig(await readFile(path, 'utf8'), siteId)
      await page.getByRole('button', { name: 'Editor Panel' }).click()
      await page.locator('button').filter({ has: page.locator('img[src$="wrench.png"]') }).click()
      await page.getByRole('button', { name: 'Menu', exact: true }).click()
      const downloadPromise = page.waitForEvent('download', { timeout: 15000 })
      await page.getByRole('button', { name: 'Export Website Configuration' }).click()
      const download = await downloadPromise
      const actual = decodeEditorConfig(await readFile(await download.path(), 'utf8'), siteId)
      assert.deepEqual(actual, expected)
      await inspectPage('home')
      report.publishedDefaults = 'passed'
    }
    if (options.interact) {
      phase = 'editor interactions'
      report.interactions = await options.interact(page, label => { phase = `editor: ${label}` })
    }
    phase = 'final rendered assets'
    await waitForRenderedAssets(page)
    report.status = errors.length ? 'failed' : 'passed'
    result.passed = errors.length === 0
  } catch (error) {
    result.errors.push(error.stack ?? String(error))
    if (result.browser) result.browser.status = 'failed'
  } finally {
    try { await context?.close() } finally { try { await browser?.close() } finally { await host?.close() } }
  }
  if (result.errors.length) { result.passed = false; if (result.browser?.status === 'passed') result.browser.status = 'failed' }
  return result
}
