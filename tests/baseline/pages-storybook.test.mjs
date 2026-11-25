import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readdir, readFile, writeFile, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { validateSiteConfig, resolveSiteConfig } from '../../config/site-config.mjs'
import { assembleStorybook, checkStorybookMount, pagesStorybookBase, qualifyPagesStorybook } from '../deployment/support/pages-bundle.mjs'
import { stories } from '../deployment/support/storybook-qualify.mjs'
import { inspectArtifact } from '../deployment/support/artifact.mjs'
import { serveStatic } from '../deployment/support/static-host.mjs'
import { assertQualifiedArtifact } from '../../scripts/assert-pages-artifact.mjs'

async function fixture(t, base = '/project/') {
  const root = await mkdtemp(join(tmpdir(), 'webblocks-combined-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const directory = join(root, 'dist')
  await mkdir(join(directory, '.vite'), { recursive: true })
  await writeFile(join(directory, 'index.html'), `<script type="module" src="${base}main.js"></script>`)
  await writeFile(join(directory, 'main.js'), 'console.log("app")')
  await writeFile(join(directory, '.vite/manifest.json'), JSON.stringify({ main: { file: 'main.js', isEntry: true } }))
  return { root, directory, base }
}
async function buildFixture(directory, base) {
  await writeFile(join(directory, 'index.html'), `<script src="${base}manager.js"></script>`)
  await writeFile(join(directory, 'manager.js'), 'console.log("manager")')
  await writeFile(join(directory, 'iframe.html'), `<script type="module" src="${base}preview.js"></script>`)
  await writeFile(join(directory, 'preview.js'), 'console.log("preview")')
  await writeFile(join(directory, 'index.json'), JSON.stringify({ entries: Object.fromEntries(Object.keys(stories).map(id => [id, { type: 'story' }])) }))
}
async function qualification(f, publish) {
  return { schemaVersion: 1, scope: 'artifact-and-browser', base: f.base, passed: true, browser: { status: 'passed' }, errors: [],
    artifact: await inspectArtifact({ ...f, requireManifest: true, isolatedSubtree: publish ? 'storybook/' : undefined }),
    storybook: publish ? { status: 'passed', passed: true, base: pagesStorybookBase(f.base), stories: Object.keys(stories), errors: [] } : { status: 'disabled' } }
}

test('Storybook publishing defaults on, can be disabled and rejects nonboolean or unknown options', () => {
  assert.deepEqual(validateSiteConfig().storybook, { publish: true })
  const config = { repository: { owner: 'owner', name: 'project' }, storybook: { publish: false } }
  assert.deepEqual(resolveSiteConfig(config, 'github-pages').storybook, { publish: false })
  assert.throws(() => validateSiteConfig({ storybook: { publish: 'false' } }), /storybook.publish/)
  assert.throws(() => validateSiteConfig({ storybook: { path: '/elsewhere/' } }), /storybook.path/)
  assert.throws(() => validateSiteConfig({ storybook: null }), /storybook/)
})

test('derived Storybook base follows the resolved Pages root, repository or nested base', () => {
  for (const [base, expected] of [['/', '/storybook/'], ['/project', '/project/storybook/'], ['/docs/site/', '/docs/site/storybook/']]) assert.equal(pagesStorybookBase(base), expected)
  assert.throws(() => pagesStorybookBase('/../'), /invalid path segment/)
})

test('assembly serves combined artifacts at root and repository paths with independent entry points', async t => {
  for (const base of ['/', '/project/', '/docs/site/']) {
    const f = await fixture(t, base)
    const before = await readFile(join(f.directory, 'main.js'))
    const assembled = await assembleStorybook({ ...f, publish: true, build: buildFixture })
    assert.equal(assembled.base, pagesStorybookBase(base))
    assert.deepEqual(await readFile(join(f.directory, 'main.js')), before)
    const artifact = await inspectArtifact({ ...f, requireManifest: true, isolatedSubtree: 'storybook/' })
    assert.ok(artifact.passed, artifact.errors.join('\n'))
    const host = await serveStatic([f]); t.after(() => host.close())
    for (const path of [base, assembled.base, assembled.base + 'iframe.html?id=example', assembled.base + 'manager.js']) assert.equal((await fetch(host.origin + path)).status, 200)
    assert.equal((await fetch(host.origin + assembled.base + 'missing.js')).status, 404)
    assert.equal(await (await fetch(host.origin + base + 'main.js')).text(), before.toString())
    assert.deepEqual(await readdir(f.root), ['dist'])
  }
})

test('disabled publication does not run a Storybook build and requires an empty reserved mount', async t => {
  const f = await fixture(t)
  assert.deepEqual(await assembleStorybook({ ...f, publish: false, build: () => assert.fail('unexpected build') }), { status: 'disabled' })
  assert.deepEqual(await qualifyPagesStorybook({ ...f, publish: false }), { status: 'disabled' })
  const report = await qualification(f, false)
  assert.equal(await assertQualifiedArtifact({ ...f, report, publishStorybook: false }), 3)
  await assert.rejects(assertQualifiedArtifact({ ...f, report: { ...report, storybook: undefined }, publishStorybook: false }), /opt-out/)
  await mkdir(join(f.directory, 'StoryBook'))
  await assert.rejects(assembleStorybook({ ...f, publish: false }), /collision/)
  await assert.rejects(assembleStorybook({ ...f, publish: true, build: buildFixture }), /collision/)
  assert.deepEqual(await readdir(join(f.directory, 'StoryBook')), [])
})

test('failed or incomplete Storybook builds leave the original application artifact unchanged', async t => {
  const f = await fixture(t)
  await assert.rejects(assembleStorybook({ ...f, publish: true, build: async (directory) => { await writeFile(join(directory, 'partial'), 'x'); throw new Error('build failed') } }), /build failed/)
  await assert.rejects(assembleStorybook({ ...f, publish: true, build: async () => {} }), /Missing Storybook output/)
  assert.equal(await checkStorybookMount(f.directory, false), null)
  assert.deepEqual(await readdir(f.root), ['dist'])
})

test('reserved mount rejects files and symlinks instead of overwriting existing content', async t => {
  const f = await fixture(t)
  const target = join(f.directory, 'storybook')
  await writeFile(target, 'application asset')
  await assert.rejects(assembleStorybook({ ...f, publish: true, build: buildFixture }), /collision/)
  assert.equal(await readFile(target, 'utf8'), 'application asset')
  await assert.rejects(checkStorybookMount(f.directory, true), /real directory/)
  await rm(target)
  if (process.platform !== 'win32') {
    await symlink(f.root, target)
    await assert.rejects(checkStorybookMount(f.directory, true), /real directory/)
    await assert.rejects(assembleStorybook({ ...f, publish: true, build: buildFixture }), /collision/)
  }
})

test('static qualification rejects Storybook resource URLs escaping its own mount even when the app has that file', async t => {
  const f = await fixture(t)
  await assembleStorybook({ ...f, publish: true, build: buildFixture })
  await writeFile(join(f.directory, 'storybook', 'iframe.html'), '<script src="/project/main.js"></script>')
  const report = await inspectArtifact({ ...f, isolatedSubtree: 'storybook/', requireManifest: true })
  assert.equal(report.passed, false)
  assert.match(report.errors.join('\n'), /URL escapes isolated subtree/)
})

test('Storybook inline script templates are not static links but actual markup remains qualified', async t => {
  for (const base of ['/', '/project/', '/docs/site/']) {
    const f = await fixture(t, base)
    await assembleStorybook({ ...f, publish: true, build: buildFixture })
    const iframe = join(f.directory, 'storybook', 'iframe.html')
    const inline = '<script>const markup = `<a href="${doc}">Docs</a><img src="${image}">`; const fake = "<!--";</script>'
    const html = '<!-- <a href="missing-comment">Comment</a> -->' + inline +
      '<STYLE>/* <img src="missing-style"> */</STYLE><textarea><a href="missing-text">Text</a></textarea>' +
      `<div data-template='<a href="missing-attribute">x</a>'></div>` +
      '<SCRIPT data-note="a > b" type="module" src="preview.js"></SCRIPT>' +
      '<a href="index.html">Real link</a>'
    await writeFile(iframe, html)
    const inspect = () => inspectArtifact({ ...f, isolatedSubtree: 'storybook/', requireManifest: true })
    let report = await inspect()
    assert.ok(report.passed, report.errors.join('\n'))
    assert.equal(report.checks[0].references, 4)
    await writeFile(iframe, html + '<a href="${doc}">Actual missing link</a><script src="missing.js"></script>')
    report = await inspect()
    assert.equal(report.passed, false)
    assert.match(report.errors.join('\n'), /Missing link \$\{doc\}/)
    assert.match(report.errors.join('\n'), /Missing asset missing.js/)
    await writeFile(iframe, html + `<script src="${base}main.js"></script>`)
    report = await inspect()
    assert.match(report.errors.join('\n'), /URL escapes isolated subtree/)
  }
})

test('publication gate rejects incomplete Storybook reports and any change to qualified Storybook files', async t => {
  const f = await fixture(t)
  await assembleStorybook({ ...f, publish: true, build: buildFixture })
  // Synthetic browser report: tests the integrity gate, not browser behavior.
  const report = await qualification(f, true)
  assert.equal(await assertQualifiedArtifact({ ...f, report, publishStorybook: true }), 8)
  for (const storybook of [undefined, { status: 'disabled' }, { ...report.storybook, stories: [] }, { ...report.storybook, base: '/wrong/' }, { ...report.storybook, errors: ['browser error'] }]) {
    await assert.rejects(assertQualifiedArtifact({ ...f, report: { ...report, storybook }, publishStorybook: true }), /Storybook/)
  }
  await assert.rejects(assertQualifiedArtifact({ ...f, report, publishStorybook: false }), /opt-out/)
  await writeFile(join(f.directory, 'storybook', 'preview.js'), 'changed')
  await assert.rejects(assertQualifiedArtifact({ ...f, report, publishStorybook: true }), /inventory changed/)
  await rm(join(f.directory, 'storybook'), { recursive: true })
  await assert.rejects(assertQualifiedArtifact({ ...f, report, publishStorybook: true }), /Expected exactly one Storybook mount/)
})

test('both workflows assemble before qualification, then verify integrity before upload', async () => {
  for (const name of ['reusable-build.yml']) {
    const workflow = await readFile(new URL(`../../.github/workflows/${name}`, import.meta.url), 'utf8')
    const gates = ['bun run build:pages --manifest', 'bun run assemble:pages', 'bun run verify:pages', 'bun scripts/assert-pages-artifact.mjs', 'name: Upload qualified Pages']
    let previous = -1
    for (const gate of gates) { const next = workflow.indexOf(gate); assert.ok(next > previous, `${name}: ${gate}`); previous = next }
    assert.match(workflow, /name: Assemble repository Storybook\n        env:\n          PUBLISH_PAGES: \$\{\{ inputs.publish_pages \}\}\n          QUALIFIED_BASE_PATH: \$\{\{ steps.metadata.outputs.base_path \}\}/)
  }
})
