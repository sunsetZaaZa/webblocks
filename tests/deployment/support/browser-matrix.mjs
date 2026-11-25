import assert from 'node:assert/strict'
import { profiles } from './browser-profiles.mjs'
import { expectedInteractions, exerciseBrowser } from './browser-interactions.mjs'
import { qualifyArtifact } from './qualify.mjs'
import { qualifyPagesStorybook, assertStorybookQualification } from './pages-bundle.mjs'
import { routes, routeAliases } from '../../../src/routing/routes.mjs'

export async function runBrowserMatrix({ directory, base, site, content, files }, dependencies = {}) {
  const qualify = dependencies.qualify ?? qualifyArtifact
  const storybook = dependencies.storybook ?? qualifyPagesStorybook
  const cases = []
  for (const profile of profiles) {
    const entry = { profile, passed: false, errors: [] }
    // Run all engines even after an earlier failure; each context is isolated.
    try {
      entry.application = await qualify({ directory, base, publicDir: 'public', expectedSite: site.site,
        expectedContent: content, requireManifest: true, isolatedSubtree: site.storybook.publish ? 'storybook/' : undefined,
        browserProfile: profile, interact: (page, setPhase) => exerciseBrowser(page, profile, site, setPhase) })
      assert.equal(entry.application.passed, true, entry.application.errors.join('\n'))
      assert.deepEqual(entry.application.artifact.files, files, 'Application artifact changed during browser matrix')
    } catch (error) { entry.errors.push(error.stack ?? String(error)) }
    try {
      entry.storybook = await storybook({ directory, base, publish: site.storybook.publish, publicDir: 'public', browserProfile: profile })
      assertStorybookQualification(entry.storybook, base, site.storybook.publish)
    } catch (error) { entry.errors.push(error.stack ?? String(error)) }
    entry.passed = entry.errors.length === 0
    cases.push(entry)
    console.log(`${entry.passed ? 'PASS' : 'FAIL'} ${profile.id}`)
    for (const error of entry.errors) console.error(`[${profile.id}] ${error}`)
  }
  return { schemaVersion: 1, base, passed: cases.every(entry => entry.passed), cases }
}

export function assertBrowserMatrix(report, { base, site, content, files }) {
  assert.ok(report?.schemaVersion === 1 && report.passed === true, 'Successful cross-browser qualification required')
  assert.equal(report.base, base)
  assert.deepEqual(report.cases?.map(entry => entry.profile), profiles, 'Incomplete or duplicate browser profiles')
  const enabled = Object.entries(routes).filter(([key]) => content.enabledPages.includes(key)).map(([, path]) => path)
  const aliases = Object.entries(routeAliases).filter(([, to]) => enabled.includes(to)).map(([from]) => from)
  const disabled = [...Object.values(routes), ...Object.keys(routeAliases)].filter(path => !enabled.includes(path) && !aliases.includes(path))
  for (const entry of report.cases) {
    assert.ok(entry.passed === true && Array.isArray(entry.errors) && entry.errors.length === 0, `Failed browser profile ${entry.profile.id}`)
    const app = entry.application
    assert.ok(app?.passed === true && app.artifact?.passed === true && app.browser?.status === 'passed' && app.errors?.length === 0, 'Incomplete application qualification')
    assert.equal(app.base, base)
    assert.deepEqual(app.artifact.files, files, 'Cross-browser artifact inventory differs')
    assert.deepEqual(app.browser.routes, enabled)
    assert.deepEqual(app.browser.aliases, aliases)
    assert.deepEqual(app.browser.disabledRoutes, disabled)
    assert.deepEqual(app.browser.interactions, expectedInteractions(site), 'Incomplete browser interaction coverage')
    assertStorybookQualification(entry.storybook, base, site.storybook.publish)
  }
}
