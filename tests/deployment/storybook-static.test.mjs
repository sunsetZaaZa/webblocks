import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { createBuildFixture } from './support/build-fixture.mjs'
import { qualifyStorybook } from './support/storybook-qualify.mjs'

const project = fileURLToPath(new URL('../../', import.meta.url))


test('Storybook production output works at root and nested static mounts', { timeout: 360000 }, async t => {
  const temporary = createBuildFixture('webblocks-storybook-')
  t.after(() => rm(temporary, { recursive: true, force: true }))
  const cases = ['/', '/project/storybook/']
  const results = []
  let browser
  try {
    const { chromium } = await import('playwright')
    browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {})
    for (const [i, base] of cases.entries()) {
      await t.test(base, { timeout: 160000 }, async () => {
        const report = { base, passed: false, stories: [], errors: [] }
        results.push(report)
        try {
          const directory = resolve(temporary, String(i))
          const build = spawnSync(process.execPath, [resolve(project, 'node_modules/storybook/dist/bin/dispatcher.js'), 'build', '--output-dir', directory], {
            cwd: project, env: { ...process.env, WEBBLOCKS_STORYBOOK_BASE_PATH: base, STORYBOOK_DISABLE_TELEMETRY: '1', CI: 'true' },
            encoding: 'utf8', timeout: 100000, maxBuffer: 16 * 1024 * 1024,
          })
          await mkdir(resolve(project, 'test-results'), { recursive: true })
          await writeFile(resolve(project, `test-results/storybook-build-${i}.log`), (build.stdout ?? '') + (build.stderr ?? ''))
          assert.equal(build.status, 0, build.error?.message ?? 'Storybook build failed; see build log')
          Object.assign(report, await qualifyStorybook({ directory, base, publicDir: resolve(project, 'public'), browser }))
          assert.ok(report.passed, report.errors.join('\n'))
        } catch (error) { report.errors.push(error.stack ?? String(error)); throw error }
      })
    }
  } catch (error) { results.push({ passed: false, errors: [error.stack ?? String(error)] }); throw error }
  finally {
    await browser?.close()
    await mkdir(resolve(project, 'test-results'), { recursive: true })
    await writeFile(resolve(project, 'test-results/storybook-static.json'), JSON.stringify({ schemaVersion: 1, passed: results.length === cases.length && results.every(result => result.passed), cases: results }, null, 2) + '\n')
  }
})
