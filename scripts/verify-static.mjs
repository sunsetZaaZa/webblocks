import { parseArgs } from 'node:util'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import { qualifyPagesStorybook } from '../tests/deployment/support/pages-bundle.mjs'
import { qualifyArtifact } from '../tests/deployment/support/qualify.mjs'

const { values } = parseArgs({ options: {
  dir: { type: 'string', default: 'dist' }, base: { type: 'string' }, public: { type: 'string', default: 'public' },
  report: { type: 'string', default: 'test-results/static-qualification.json' },
  'artifact-only': { type: 'boolean' }, 'require-manifest': { type: 'boolean' }, pages: { type: 'boolean' },
} })
if (values.pages && values.base !== undefined) throw new Error('Use either --pages or --base, not both')
if (!values.pages && values.base === undefined) throw new Error('Specify --pages or --base / or --base /repository/ explicitly')
if (values.pages && values['artifact-only']) throw new Error('--pages requires browser qualification')
const path = resolve(values.report)
const directory = resolve(values.dir)
if (path === directory || path.startsWith(directory + sep)) throw new Error('Qualification report must be outside the artifact directory')
let report
try {
  // Use Vite's actual resolved configuration, including .env files and the
  // repository configuration. Never guess the expected base from the artifact.
  let base = values.base
  let expectedSite, expectedContent, publishStorybook
  if (values.pages) {
    const { resolveConfig } = await import('vite')
    const config = await resolveConfig({ mode: 'github-pages' }, 'build', 'production', 'production')
    base = config.base
    const site = JSON.parse(config.define.__WEBBLOCKS_SITE__)
    expectedSite = site.site
    expectedContent = JSON.parse(config.define.__WEBBLOCKS_CONTENT__)
    publishStorybook = site.storybook.publish
  }
  report = await qualifyArtifact({ directory: values.dir, base, publicDir: values.public, expectedSite, expectedContent,
    isolatedSubtree: publishStorybook ? 'storybook/' : undefined,
    artifactOnly: values['artifact-only'], requireManifest: values.pages || values['require-manifest'] })
  if (values.pages && report.passed) {
    try {
      report.storybook = await qualifyPagesStorybook({ directory: values.dir, base, publish: publishStorybook, publicDir: values.public })
      if (report.storybook.status === 'failed') report.errors.push(...report.storybook.errors)
    } catch (error) {
      report.storybook = { status: 'failed', errors: [error.stack ?? String(error)] }
      report.errors.push(...report.storybook.errors)
    }
    report.passed = report.errors.length === 0
  }
} catch (error) {
  report = { passed: false, artifact: null, browser: null, errors: [error.stack ?? String(error)] }
}
await mkdir(dirname(path), { recursive: true })
await writeFile(path, JSON.stringify({ schemaVersion: 1, scope: values['artifact-only'] ? 'artifact-only' : 'artifact-and-browser', ...report }, null, 2) + '\n')
console.log(`${report.passed ? 'PASS' : 'FAIL'} (${values['artifact-only'] ? 'artifact only' : 'artifact and browser'}): ${path}`)
for (const error of report.errors) console.error(error)
if (!report.passed) process.exitCode = 1
