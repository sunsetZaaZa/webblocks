import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { assertQualifiedArtifact } from './assert-pages-artifact.mjs'
import { runBrowserMatrix, assertBrowserMatrix } from '../tests/deployment/support/browser-matrix.mjs'

const reportPath = 'test-results/cross-browser.json'
await mkdir('test-results', { recursive: true })
let report = { schemaVersion: 1, passed: false, cases: [], errors: [] }
// Replace any stale success before attempting dependency resolution.
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n')
try {
  const { resolveConfig } = await import('vite')
  const config = await resolveConfig({ mode: 'github-pages' }, 'build', 'production', 'production')
  const site = JSON.parse(config.define.__WEBBLOCKS_SITE__)
  const content = JSON.parse(config.define.__WEBBLOCKS_CONTENT__)
  const qualification = JSON.parse(await readFile('test-results/static-qualification.json', 'utf8'))
  const options = { directory: 'dist', base: config.base, site, content, files: qualification.artifact.files }
  const verify = () => assertQualifiedArtifact({ directory: options.directory, base: options.base, report: qualification, publicDir: 'public', publishStorybook: site.storybook.publish, expectedContent: content })
  await verify()
  report = await runBrowserMatrix(options)
  await verify()
  assertBrowserMatrix(report, options)
} catch (error) {
  report.passed = false
  report.errors = [...(report.errors ?? []), error.stack ?? String(error)]
  console.error(error.message)
}
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n')
if (!report.passed) process.exitCode = 1
