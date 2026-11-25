import assert from 'node:assert/strict'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { createBuildFixture } from './support/build-fixture.mjs'
import { validateSiteContent } from '../../config/site-content.mjs'
import { qualifyArtifact } from './support/qualify.mjs'

const project = fileURLToPath(new URL('../../', import.meta.url))

test('strict static Pages qualification matrix', { timeout: 360000 }, async t => {
  const root = createBuildFixture('webblocks-static-')
  const reportPath = resolve(project, 'test-results/static-matrix.json')
  const results = []
  const keys = ['WEBBLOCKS_DEPLOYMENT', 'WEBBLOCKS_BASE_PATH', 'GITHUB_REPOSITORY', 'WEBBLOCKS_CONFIG_FILE']
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]))
  t.after(async () => {
    for (const key of keys) if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]
    await rm(root, { recursive: true, force: true })
  })
  const cases = [
    { name: 'project', repository: 'owner/project', base: '/project/', override: 'auto' },
    { name: 'organization-root', repository: 'owner/owner.github.io', base: '/', override: 'auto' },
    { name: 'custom-domain', repository: 'owner/project', base: '/', override: '/' },
    { name: 'nested', repository: 'owner/project', base: '/docs/site/', override: '/docs/site/' },
  ]
  try {
    const { build } = await import('vite')
    for (const entry of cases) {
      await t.test(entry.name, { timeout: 80000 }, async () => {
        let result
        try {
          const folder = resolve(root, entry.name)
          await mkdir(folder)
          const configPath = resolve(folder, 'webblocks.config.json')
          const site = { title: `Static ${entry.name} & test`, description: 'Pages qualification', language: 'en-US' }
          await writeFile(configPath, JSON.stringify({ site }))
          // Exercise different content and disabled routes in the real production builds.
          const overrides = entry.name === 'project' ? { pages: { home: { heading: 'Project A homepage' }, apps: { name: 'Project A app' } } } : entry.name === 'nested' ? {
            enabledPages: ['home', 'apps', 'libraries', 'about'], navigation: [{ page: 'home', label: 'Project B' }, { page: 'about', label: 'Contact' }, { page: 'apps', label: 'Downloads' }],
            pages: { home: { heading: 'Project B homepage' }, apps: { name: 'Project B app', icon: 'characters/crunch_norm_right_web.png' } },
          } : {}
          await mkdir(resolve(folder, 'site'))
          await writeFile(resolve(folder, 'site/content.json'), JSON.stringify(overrides))
          const expectedContent = validateSiteContent(overrides)
          const siteId = `github:${entry.repository}`
          const defaultsPath = resolve(folder, 'webblocks.defaults.json')
          await writeFile(defaultsPath, JSON.stringify({ format: 'webblocks-editor-config', schemaVersion: 1, siteId, data: {
            characterTracker: Array.from({ length: 8 }, (_, i) => ({ page: i + 1, chars: i ? [] : [{ identifier: 'published-wgp08', type: 1, attributes: [0], orientation: 0, currentX: 20, currentY: 50, toRender: true, sizes: { width: 48, height: 48 } }] })),
            menuFields: { targetFPS: 44, showFPS: false, runLength: 10, nonStop: false }, settingsFields: { juggleAnimationBounding: false },
          } }))
          Object.assign(process.env, { WEBBLOCKS_DEPLOYMENT: 'github-pages', WEBBLOCKS_BASE_PATH: entry.override, GITHUB_REPOSITORY: entry.repository, WEBBLOCKS_CONFIG_FILE: configPath })
          const directory = resolve(folder, 'dist')
          await build({ root: project, configFile: resolve(project, 'vite.config.ts'), mode: 'github-pages', logLevel: 'silent', build: { outDir: directory, manifest: true } })
          result = await qualifyArtifact({ directory, base: entry.base, publicDir: resolve(project, 'public'), requireManifest: true, expectedSite: site, expectedContent, expectedDefaults: { siteId, path: defaultsPath } })
        } catch (error) { result = { passed: false, errors: [error.stack ?? String(error)] } }
        results.push({ name: entry.name, ...result })
        assert.ok(result.passed, result.errors.join('\n'))
      })
    }
  } catch (error) { results.push({ name: 'matrix setup', passed: false, errors: [error.stack ?? String(error)] }); throw error }
  finally {
    await mkdir(resolve(project, 'test-results'), { recursive: true })
    await writeFile(reportPath, JSON.stringify({ schemaVersion: 1, passed: results.length === cases.length && results.every(r => r.passed), cases: results }, null, 2) + '\n')
  }
})
