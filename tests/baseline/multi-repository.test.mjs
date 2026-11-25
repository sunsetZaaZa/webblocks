import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { prepareRepositories, rehearseUpgrade, repositoryEnvironment, scenarios } from '../deployment/support/multi-repository.mjs'
import { serveStatic } from '../deployment/support/static-host.mjs'
import { decodeEditorConfig } from '../../src/state-management/editor-config.mjs'
import { createPersistence, LEGACY_KEY } from '../../src/state-management/persistence.mjs'
const root = fileURLToPath(new URL('../../', import.meta.url))

test('multi-repository child builds cannot inherit caller Pages identity or overrides', () => {
  const env = repositoryEnvironment('beta', { GITHUB_REPOSITORY: 'other/site', GITHUB_REPOSITORY_OWNER: 'other', WEBBLOCKS_BASE_PATH: '/wrong/', WEBBLOCKS_CONFIG_FILE: '/wrong.json', PAGES_BASE_URL: 'https://wrong.test', VITE_APP_ENV: 'wrong', PATH: 'keep' })
  assert.deepEqual(env, { PATH: 'keep', GITHUB_REPOSITORY: 'example/beta', CI: 'true', STORYBOOK_DISABLE_TELEMETRY: '1' })
  assert.deepEqual(scenarios.map(s => s.base), ['/', '/alpha/', '/beta/'])
  assert.equal(scenarios[2].source, 'docs/website')
})

test('one actual packed dependency generates three independent repositories and rehearses safe staged regeneration', t => {
  const workspace = mkdtempSync(join(tmpdir(), 'wgp17-baseline-'))
  t.after(() => rmSync(workspace, { recursive: true, force: true }))
  const report = {}
  const { sites, consumer, manifest } = prepareRepositories(workspace, root, report)
  assert.equal(sites.length, 3)
  assert.equal(report.package.version, manifest.version)
  assert.deepEqual(sites.map(s => s.summary.storybook), [false, true, false])
  assert.deepEqual(sites.map(s => s.summary.routes), [['home', 'apps'], ['home', 'apps', 'application'], ['home', 'apps']])
  assert.equal(rehearseUpgrade(workspace, consumer, sites[2]).status, 'passed')
  for (const a of sites) for (const b of sites) if (a !== b) assert.throws(() => decodeEditorConfig(JSON.stringify(a.summary.defaults), b.summary.siteId), /belongs to/)
  const values = new Map([[LEGACY_KEY, 'unclaimed legacy data']])
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
  const ports = sites.map(site => createPersistence(storage, site.summary.siteId))
  sites.forEach((site, i) => {
    const data = site.summary.defaults.data
    assert.equal(ports[i].save({ ...data, menuFields: { ...data.menuFields, presistCharacters: true }, openControlPanel: false, openSettingsPanel: false, openControllerPanel: false, settingsCurrentArea: 0, rosterPage: 1 }), null)
  })
  ports[1].clear(true)
  assert.deepEqual(ports[1].load(), {})
  for (const i of [0, 2]) assert.equal(ports[i].load().data.menuFields.targetFPS, sites[i].fps)
  assert.equal(values.get(LEGACY_KEY), 'unclaimed legacy data')
})

test('shared CI requires multi-repository qualification before artifact upload', () => {
  const workflow = readFileSync(join(root, '.github/workflows/reusable-build.yml'), 'utf8')
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  assert.ok(pkg.scripts['test:multi-repository'])
  const gate = workflow.indexOf('bun run test:multi-repository')
  assert.ok(gate > workflow.indexOf('bun run pw:install'))
  for (const label of ['Upload qualified Pages build', 'Upload qualified Pages artifact']) assert.ok(gate < workflow.indexOf(label))
  assert.doesNotMatch(workflow, /continue-on-error/)
})


test('root and project static mounts serve same-named files independently without fallback', async t => {
  const workspace = mkdtempSync(join(tmpdir(), 'wgp17-http-'))
  let host
  t.after(async () => { try { await host?.close() } finally { rmSync(workspace, { recursive: true, force: true }) } })
  const mounts = scenarios.map(site => {
    const directory = join(workspace, site.repo)
    mkdirSync(join(directory, 'project'), { recursive: true })
    writeFileSync(join(directory, 'index.html'), site.title)
    writeFileSync(join(directory, 'project/badge.svg'), site.color)
    if (site.storybook) {
      mkdirSync(join(directory, 'storybook'))
      writeFileSync(join(directory, 'storybook/index.json'), '{}')
    }
    return { directory, base: site.base }
  })
  host = await serveStatic(mounts)
  for (const site of scenarios) {
    const base = host.origin + site.base
    const entry = await fetch(base); assert.equal(entry.status, 200); assert.equal(await entry.text(), site.title)
    const badge = await fetch(base + 'project/badge.svg'); assert.equal(badge.status, 200); assert.equal(await badge.text(), site.color)
    assert.equal((await fetch(base + 'storybook/index.json')).status, site.storybook ? 200 : 404)
    assert.equal((await fetch(base + 'missing.png')).status, 404)
    assert.equal((await fetch(base + 'apps/application')).status, 404)
  }
})
