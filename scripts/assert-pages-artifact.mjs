import assert from 'node:assert/strict'
import { lstat, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { normalizeBasePath } from '../config/deployment.mjs'
import { assertStorybookQualification, checkStorybookMount } from '../tests/deployment/support/pages-bundle.mjs'
import { routes, routeAliases } from '../src/routing/routes.mjs'
import { inspectArtifact } from '../tests/deployment/support/artifact.mjs'
import { assertBrowserMatrix } from '../tests/deployment/support/browser-matrix.mjs'
import { assertPublicTree } from './security-review.mjs'

export async function assertQualifiedArtifact({ directory, base, report, publicDir, publishStorybook = false, expectedContent }) {
  base = normalizeBasePath(base)
  assert.ok(report.schemaVersion === 1 && report.scope === 'artifact-and-browser' && report.passed === true && report.artifact?.passed === true && report.browser?.status === 'passed' && Array.isArray(report.errors) && report.errors.length === 0, 'Full successful browser qualification is required')
  assert.equal(report.base, base, 'Qualification base differs from Pages metadata')
  assert.equal(report.artifact.base, base, 'Artifact base differs from Pages metadata')
  if (expectedContent) {
    const enabled = Object.entries(routes).filter(([key]) => expectedContent.enabledPages.includes(key)).map(([, path]) => path)
    const aliases = Object.entries(routeAliases).filter(([, to]) => enabled.includes(to)).map(([from]) => from)
    const disabled = [...Object.values(routes), ...Object.keys(routeAliases)].filter(path => !enabled.includes(path) && !aliases.includes(path))
    assert.deepEqual(report.browser.routes, enabled, 'Incomplete enabled route qualification')
    assert.deepEqual(report.browser.aliases, aliases, 'Incomplete alias qualification')
    assert.deepEqual(report.browser.disabledRoutes, disabled, 'Incomplete disabled route qualification')
  }
  assertStorybookQualification(report.storybook, base, publishStorybook)
  await checkStorybookMount(directory, publishStorybook)
  const current = await inspectArtifact({ directory, base, publicDir, requireManifest: true, isolatedSubtree: publishStorybook ? 'storybook/' : undefined })
  assert.ok(current.passed, current.errors.join('\n'))
  assert.deepEqual(current.files, report.artifact.files, 'Qualified artifact inventory changed')
  for (const file of current.files) {
    // The official Pages packager excludes .git and .github; reject those
    // entries rather than publishing a different inventory from the one tested.
    assert.ok(!file.path.split('/').some(part => part === '.git' || part === '.github'), 'Excluded Git metadata found in artifact')
    assert.equal((await lstat(resolve(directory, file.path))).nlink, 1, `Hard-linked file: ${file.path}`)
  }
  return current.files.length
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  assertPublicTree('dist')
  const report = JSON.parse(await readFile('test-results/static-qualification.json', 'utf8'))
  const { resolveConfig } = await import('vite')
  const config = await resolveConfig({ mode: 'github-pages' }, 'build', 'production', 'production')
  const site = JSON.parse(config.define.__WEBBLOCKS_SITE__)
  if (process.argv.includes('--require-cross-browser')) {
    const matrix = JSON.parse(await readFile('test-results/cross-browser.json', 'utf8'))
    assertBrowserMatrix(matrix, { base: config.base, site, content: JSON.parse(config.define.__WEBBLOCKS_CONTENT__), files: report.artifact.files })
  }
  const count = await assertQualifiedArtifact({ directory: 'dist', base: config.base, report, publicDir: 'public', publishStorybook: site.storybook.publish, expectedContent: JSON.parse(config.define.__WEBBLOCKS_CONTENT__) })
  console.log(`Qualified artifact unchanged: ${count} files`)
}
