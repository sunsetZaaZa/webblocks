import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { runBun, installFramework } from './bun-package.mjs'
import { packFramework } from '../../../scripts/pack-framework.mjs'
import { templateFiles } from '../../../scripts/init-site.mjs'
import { loadSiteConfig, resolveSiteConfig } from '../../../config/site-config.mjs'
import { loadSiteContent } from '../../../config/site-content.mjs'
import { decodeEditorConfig } from '../../../src/state-management/editor-config.mjs'
import { storageKey } from '../../../src/state-management/persistence.mjs'

const readJSON = path => JSON.parse(readFileSync(path, 'utf8'))
const writeJSON = (path, data) => writeFileSync(path, JSON.stringify(data, null, 2) + '\n')
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
export const ownedFiles = ['webblocks.config.json', 'webblocks.defaults.json', 'site/content.json', 'public/project/badge.svg']
export const scenarios = [
  { repo: 'example.github.io', source: '.', base: '/', title: 'Example organization', fps: 31, color: '#124578', storybook: false, detail: false },
  { repo: 'alpha', source: '.', base: '/alpha/', title: 'Alpha project', fps: 42, color: '#782345', storybook: true, detail: true },
  { repo: 'beta', source: 'docs/website', base: '/beta/', title: 'Beta project', fps: 53, color: '#237845', storybook: false, detail: false },
]

// Do not inherit the invoking repository identity or Pages build overrides.
export function repositoryEnvironment(repo, source = process.env) {
  const env = Object.fromEntries(Object.entries(source).filter(([key]) => !/^(?:WEBBLOCKS_|PAGES_|VITE_|GITHUB_REPOSITORY$|GITHUB_REPOSITORY_OWNER$)/i.test(key)))
  return { ...env, GITHUB_REPOSITORY: `example/${repo}`, CI: 'true', STORYBOOK_DISABLE_TELEMETRY: '1' }
}
export { runBun }
export function assertRun(result, label) {
  assert.equal(result.status, 0, `${label}: ${result.error?.message ?? result.signal ?? ''}\n${result.stdout ?? ''}\n${result.stderr ?? ''}`)
}
export function fixtureSummary(site) {
  const configPath = join(site.directory, 'webblocks.config.json')
  const resolved = resolveSiteConfig(loadSiteConfig(configPath), 'github-pages', repositoryEnvironment(site.repo))
  const content = loadSiteContent(configPath, join(site.directory, 'public'))
  const defaults = decodeEditorConfig(readFileSync(join(site.directory, 'webblocks.defaults.json'), 'utf8'), resolved.siteId)
  assert.equal(resolved.deployment.basePath, site.base)
  assert.equal(resolved.storybook.publish, site.storybook)
  assert.equal(content.pages.home.heading, site.title)
  assert.equal(defaults.data.menuFields.targetFPS, site.fps)
  assert.equal(defaults.data.characterTracker[0].chars[0].identifier, `${site.repo}-character`)
  return { siteId: resolved.siteId, base: site.base, source: site.source, title: site.title, storybook: site.storybook, routes: content.enabledPages, storageKey: storageKey(resolved.siteId), defaults, content, artworkHash: hash(readFileSync(join(site.directory, 'public/project/badge.svg'))) }
}
export function createFromInstalled(consumer, destination, site) {
  const cli = join(consumer, 'node_modules/@webblocks/webblocks/bin/create.mjs')
  return spawnSync(process.execPath, [cli, '--destination', destination, '--owner', 'example', '--repo', site.repo, '--title', site.title, '--description', `Independent ${site.repo} website`, '--storybook', String(site.storybook), '--roster', 'empty'], { cwd: consumer, encoding: 'utf8', timeout: 30000, env: repositoryEnvironment(site.repo) })
}
export function prepareRepositories(workspace, source, report = {}) {
  const { archive, manifest } = packFramework(join(workspace, 'package'), source)
  const consumer = join(workspace, 'consumer'); mkdirSync(consumer)
  writeJSON(join(consumer, 'package.json'), { name: 'multi-repository-fixture', private: true, type: 'module' })
  const installed = installFramework(consumer, archive, manifest)
  assert.equal(readJSON(join(installed, 'package.json')).version, manifest.version)
  report.package = { name: manifest.name, version: manifest.version, sha256: manifest.sha256, integrity: manifest.integrity }
  const files = templateFiles(source)
  const sites = scenarios.map(scenario => {
    const repository = join(workspace, scenario.repo)
    mkdirSync(repository)
    const directory = resolve(repository, scenario.source)
    if (scenario.source !== '.') {
      mkdirSync(join(repository, 'docs'))
      writeFileSync(join(repository, 'README.md'), 'Existing software project\n')
      writeFileSync(join(repository, 'project-source.txt'), 'Unrelated source\n')
    }
    const site = { ...scenario, repository, directory }
    assertRun(createFromInstalled(consumer, directory, site), `Generate ${site.repo}`)
    for (const file of files) assert.deepEqual(readFileSync(join(directory, file)), readFileSync(join(source, file)), `${site.repo}: ${file}`)
    const config = readJSON(join(directory, 'site/content.json'))
    config.enabledPages = ['home', 'apps', ...(site.detail ? ['application'] : [])]
    config.navigation.push({ page: 'apps', label: `${site.title} apps` })
    config.pages.apps = { name: `${site.title} app`, icon: 'project/badge.svg', iconAlt: `${site.title} badge` }
    writeJSON(join(directory, 'site/content.json'), config)
    writeFileSync(join(directory, 'public/project/badge.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="${site.color}"/></svg>\n`)
    const defaults = readJSON(join(directory, 'webblocks.defaults.json'))
    defaults.data.menuFields.targetFPS = site.fps
    defaults.data.characterTracker[0].chars = [{ identifier: `${site.repo}-character`, type: 1, attributes: [0], orientation: 1, currentX: 20, currentY: 50, toRender: true, sizes: { width: 48, height: 48 } }]
    writeJSON(join(directory, 'webblocks.defaults.json'), defaults)
    site.summary = fixtureSummary(site)
    if (site.source !== '.') {
      assert.equal(readFileSync(join(repository, 'README.md'), 'utf8'), 'Existing software project\n')
      assert.equal(readFileSync(join(repository, 'project-source.txt'), 'utf8'), 'Unrelated source\n')
    }
    return site
  })
  for (const field of ['siteId', 'storageKey', 'base', 'artworkHash']) assert.equal(new Set(sites.map(site => site.summary[field])).size, sites.length, field)
  return { sites, consumer, manifest }
}

// Rehearse the documented manual upgrade: never write over a live site. The
// current package is regenerated in staging, then repository-owned files are
// carried forward explicitly. This does not pretend to test a future version.
export function rehearseUpgrade(workspace, consumer, site) {
  const stage = join(workspace, 'upgrade-stage')
  const before = new Map(ownedFiles.map(file => [file, readFileSync(join(site.directory, file))]))
  const blocked = createFromInstalled(consumer, site.directory, site)
  assert.notEqual(blocked.status, 0, 'In-place regeneration unexpectedly succeeded')
  assertRun(createFromInstalled(consumer, stage, site), 'Generate staged framework')
  for (const [file, bytes] of before) {
    assert.deepEqual(readFileSync(join(site.directory, file)), bytes, `Existing file changed: ${file}`)
    copyFileSync(join(site.directory, file), join(stage, file))
  }
  const staged = fixtureSummary({ ...site, directory: stage })
  assert.deepEqual(staged, site.summary)
  assert.ok(existsSync(join(stage, 'bun.lock')))
  return { status: 'passed', siteId: staged.siteId, filesPreserved: [...before.keys()], scope: 'same-version staged regeneration' }
}
