import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { createBuildFixture } from './support/build-fixture.mjs'
import { spawnSync } from 'node:child_process'
import { prepareRepositories, rehearseUpgrade, repositoryEnvironment, runBun, assertRun } from './support/multi-repository.mjs'
import { serveStatic } from './support/static-host.mjs'
import { decodeEditorConfig } from '../../src/state-management/editor-config.mjs'
import { LEGACY_KEY } from '../../src/state-management/persistence.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const reportDir = join(root, 'test-results', 'multi-repository')
const readJSON = path => JSON.parse(readFileSync(path, 'utf8'))

async function verifySharedOrigin(sites, report) {
  const { chromium } = await import('playwright')
  const host = await serveStatic(sites.map(s => ({ base: s.base, directory: join(s.directory, 'dist') })))
  let browser, context
  const errors = []
  report.sharedOrigin = { status: 'running', errors, checks: [] }
  const checks = report.sharedOrigin.checks
  try {
    browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {})
    context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' })
    const page = await context.newPage()
    page.setDefaultTimeout(15000)
    page.setDefaultNavigationTimeout(20000)
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    page.on('response', response => { if (new URL(response.url()).origin === host.origin && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`) })
    page.on('requestfailed', request => { if (request.failure()?.errorText !== 'net::ERR_ABORTED') errors.push(`Failed request: ${request.url()}`) })
    page.on('dialog', dialog => dialog.accept())
    const read = key => page.evaluate(k => localStorage.getItem(k), key)
    const write = (key, value) => page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value])
    const persist = page.getByRole('checkbox', { name: 'Persist Characters' })
    async function visit(site, path = '/') {
      await page.goto(host.origin + site.base + '#' + path)
      assert.equal(await page.title(), site.title)
      if (path === '/') await page.getByText(site.title, { exact: true }).waitFor()
    }
    async function menu() {
      if (!await persist.isVisible()) {
        const wrench = page.locator('button').filter({ has: page.locator('img[src$="wrench.png"]') })
        if (!await wrench.isVisible()) await page.getByRole('button', { name: 'Editor Panel' }).click()
        if (!await page.getByRole('button', { name: 'Menu', exact: true }).isVisible()) await wrench.click()
        await page.getByRole('button', { name: 'Menu', exact: true }).click()
      }
      await persist.waitFor()
    }
    async function exported(site) {
      const pending = page.waitForEvent('download')
      await page.getByRole('button', { name: 'Export Website Configuration' }).click()
      const download = await pending
      return decodeEditorConfig(readFileSync(await download.path(), 'utf8'), site.summary.siteId)
    }
    const upload = value => page.getByLabel('Website configuration file').setInputFiles({ name: 'webblocks.defaults.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(value)) })
    const saved = new Map()
    // Same path and filename in each independent deployment, different bytes.
    for (const site of sites) {
      await visit(site, '/apps')
      const badge = page.getByRole('img', { name: `${site.title} badge` })
      await badge.waitFor({ state: 'attached' })
      assert.equal(await badge.evaluate(async img => { await img.decode(); return img.src }), host.origin + site.base + 'project/badge.svg')
      const response = await fetch(host.origin + site.base + 'project/badge.svg')
      assert.equal(response.status, 200)
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), readFileSync(join(site.directory, 'public/project/badge.svg')))
      await visit(site); await menu()
      assert.deepEqual(await exported(site), site.summary.defaults)
      const raw = await read(site.summary.storageKey)
      assert.ok(raw, `Missing saved state for ${site.repo}`)
      saved.set(site.repo, raw)
      checks.push(`${site.repo}: independent content, artwork and published defaults`)
    }
    const [organization, alpha, beta] = sites
    const legacy = 'unclaimed legacy fixture'
    await write(LEGACY_KEY, legacy)
    await visit(alpha); await menu()
    const edited = await exported(alpha)
    edited.data.menuFields.targetFPS = 67
    await upload(edited)
    await page.getByRole('status').filter({ hasText: 'imported and saved' }).waitFor()
    await page.reload(); await menu()
    assert.equal((await exported(alpha)).data.menuFields.targetFPS, 67)
    for (const site of [organization, beta]) assert.equal(await read(site.summary.storageKey), saved.get(site.repo))
    checks.push('Alpha import and reload leave root and Beta storage unchanged')
    await visit(beta); await menu()
    const betaBefore = await read(beta.summary.storageKey)
    await upload(edited)
    await page.getByRole('status').filter({ hasText: `belongs to ${alpha.summary.siteId}` }).waitFor()
    assert.equal(await read(beta.summary.storageKey), betaBefore)
    await persist.uncheck()
    await page.reload(); await menu()
    assert.equal(await persist.isChecked(), false)
    assert.deepEqual(JSON.parse(await read(beta.summary.storageKey)), { version: 1, siteId: beta.summary.siteId, enabled: false })
    assert.deepEqual(await exported(beta), beta.summary.defaults)
    checks.push('Foreign import rejected; Beta opt-out survives reload')
    await visit(alpha); await menu()
    assert.equal((await exported(alpha)).data.menuFields.targetFPS, 67)
    await page.getByRole('button', { name: 'Clear Character Sheet' }).click()
    assert.equal(await read(alpha.summary.storageKey), null)
    assert.deepEqual(await exported(alpha), alpha.summary.defaults)
    assert.equal(await read(organization.summary.storageKey), saved.get(organization.repo))
    assert.equal(JSON.parse(await read(beta.summary.storageKey)).enabled, false)
    assert.equal(await read(LEGACY_KEY), legacy)
    checks.push('Alpha clear restores its own defaults and preserves all other records')
    // Root mount coexists with both project mounts, not an SPA fallback.
    for (const site of sites) {
      assert.equal((await fetch(host.origin + site.base + 'missing-wgp17.png')).status, 404)
      const storybook = await fetch(host.origin + site.base + 'storybook/index.json')
      assert.equal(storybook.status, site.storybook ? 200 : 404)
    }
    assert.deepEqual(errors, [])
    report.sharedOrigin.status = 'passed'
  } finally {
    try { await context?.close() } finally { try { await browser?.close() } finally { await host.close() } }
  }
}

test('three package-generated repository sites qualify independently and coexist on one origin', { timeout: 1200000 }, async () => {
  mkdirSync(reportDir, { recursive: true })
  const workspace = createBuildFixture('wgp17-deployment-')
  const report = { schemaVersion: 1, passed: false, sites: [], sharedOrigin: { status: 'not-run' }, errors: [] }
  try {
    const { sites, consumer } = prepareRepositories(workspace, root, report)
    report.sites = sites.map(site => {
      const { defaults, content: _content, ...summary } = site.summary
      return { repo: site.repo, ...summary, defaultsFPS: defaults.data.menuFields.targetFPS, status: 'not-run', commands: [] }
    })
    report.upgrade = rehearseUpgrade(workspace, consumer, sites[2])
    // Fail early when the parent qualification has not installed prerequisites.
    await import('playwright')
    await import('vite')
    for (const [siteIndex, site] of sites.entries()) {
      const entry = report.sites[siteIndex]
      entry.status = 'running'
      const env = repositoryEnvironment(site.repo)
      const commands = [
        ['install', '--frozen-lockfile'],
        ['run', 'build:pages', '--manifest'],
        ['run', 'assemble:pages'],
        ['run', 'verify:pages'],
        null, // final integrity check runs directly with Bun
      ]
      // Execute the integrity script with the same Bun runtime.
      for (const [index, args] of commands.entries()) {
        const result = args === null
          ? spawnSync(process.execPath, ['scripts/assert-pages-artifact.mjs'], { cwd: site.directory, env, encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024 })
          : runBun(site.directory, args, { env })
        const label = args === null ? 'bun scripts/assert-pages-artifact.mjs' : `bun ${args.join(' ')}`
        const log = `${site.repo}-${index}.log`
        writeFileSync(join(reportDir, log), `${result.stdout ?? ''}\n${result.stderr ?? ''}\n${result.error?.message ?? ''}`)
        entry.commands.push({ command: label, status: result.status, log })
        if (args?.[1] === 'verify:pages') {
          try { entry.qualification = readJSON(join(site.directory, 'test-results/static-qualification.json')) } catch { /* failure log retained */ }
        }
        assertRun(result, `${site.repo}: ${label}`)
      }
      assert.equal(entry.qualification.passed, true)
      assert.equal(entry.qualification.base, site.base)
      assert.equal(entry.qualification.storybook.status, site.storybook ? 'passed' : 'disabled')
      entry.status = 'passed'
    }
    await verifySharedOrigin(sites, report)
    report.passed = true
  } catch (error) {
    report.errors.push(error.stack ?? String(error))
    for (const site of report.sites) if (site.status === 'running') site.status = 'failed'
    if (report.sharedOrigin?.status === 'running') report.sharedOrigin.status = 'failed'
    throw error
  } finally {
    writeFileSync(join(reportDir, 'qualification.json'), JSON.stringify(report, null, 2) + '\n')
    rmSync(workspace, { recursive: true, force: true })
  }
})
