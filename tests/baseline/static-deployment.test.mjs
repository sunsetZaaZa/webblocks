import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, mkdir, writeFile, rm, symlink, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, dirname } from 'node:path'
import { request } from 'node:http'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { inspectArtifact } from '../deployment/support/artifact.mjs'
import { serveStatic } from '../deployment/support/static-host.mjs'

async function fixture(t, base = '/project/') {
  const root = await mkdtemp(resolve(tmpdir(), 'webblocks-static-test-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const directory = resolve(root, 'dist'), publicDir = resolve(root, 'public')
  async function put(name, content, folder = directory) {
    const path = resolve(folder, name); await mkdir(dirname(path), { recursive: true }); await writeFile(path, content)
  }
  const html = `<html><head><link rel="stylesheet" href="${base}assets/main.css"><link rel="modulepreload" href="${base}assets/chunk.js"></head><body><a href="${base}#/apps">Apps</a><img src="${base}duck.png?v=1&amp;x=2"><script type="module" src="${base}assets/main.js"></script></body></html>`
  await put('index.html', html)
  await put('assets/main.js', 'import "./chunk.js";')
  await put('assets/chunk.js', 'export const value = 1;')
  await put('assets/main.css', `@font-face{src:url('./font.woff2')}body{background:url(${base}duck.png#view)}`)
  await put('assets/font.woff2', 'font-fixture')
  await put('duck.png', 'image-fixture'); await put('duck.png', 'image-fixture', publicDir)
  await put('.vite/manifest.json', JSON.stringify({ 'src/main.tsx': { file: 'assets/main.js', isEntry: true, css: ['assets/main.css'], imports: ['_chunk.js'] }, '_chunk.js': { file: 'assets/chunk.js', assets: ['assets/font.woff2'] } }))
  return { root, directory, publicDir, base, html, put, inspect: (options = {}) => inspectArtifact({ directory, base, publicDir, requireManifest: true, ...options }) }
}

function rawRequest(origin, path, method = 'GET') {
  return new Promise((done, reject) => {
    const req = request(origin, { path, method }, res => { res.resume(); res.on('end', () => done(res.statusCode)) })
    req.on('error', reject); req.end()
  })
}

test('compiled artifact inspection accepts root, repository and nested static paths', async t => {
  for (const base of ['/', '/project/', '/docs/site/']) {
    const f = await fixture(t, base)
    const report = await f.inspect()
    assert.equal(report.passed, true, report.errors.join('\n'))
    assert.equal(report.files.length, 7)
    assert.ok(report.files.every(f => /^[a-f0-9]{64}$/.test(f.sha256)))
    assert.ok(report.checks[0].references >= 6)
  }
})

test('artifact inspection rejects root-relative escape, broken links, missing HTML and source entry', async t => {
  const f = await fixture(t)
  await f.put('index.html', f.html.replace('/project/assets/main.js', '/src/main.tsx').replace('/project/#/apps', '/project/missing-page'))
  let report = await f.inspect()
  assert.equal(report.passed, false)
  assert.match(report.errors.join('\n'), /escapes deployment base/)
  assert.match(report.errors.join('\n'), /Uncompiled source entry/)
  assert.match(report.errors.join('\n'), /Missing link/)
  await rm(resolve(f.directory, 'index.html'))
  report = await f.inspect()
  assert.match(report.errors.join('\n'), /Missing entry document/)
})

test('CSS relative references, fonts and manifest dependencies cannot disappear silently', async t => {
  const f = await fixture(t)
  await rm(resolve(f.directory, 'assets/font.woff2'))
  await rm(resolve(f.directory, 'assets/chunk.js'))
  await f.put('assets/main.css', '@import "missing.css"; @font-face{src:url(./font.woff2)}')
  let report = await f.inspect()
  assert.equal(report.passed, false)
  assert.match(report.errors.join('\n'), /Missing asset missing.css/)
  assert.match(report.errors.join('\n'), /Missing asset .\/font.woff2/)
  assert.match(report.errors.join('\n'), /Missing output assets\/chunk.js/)
  await f.put('.vite/manifest.json', JSON.stringify({ entry: { file: 'assets/main.js', isEntry: true, dynamicImports: ['absent'] } }))
  report = await f.inspect()
  assert.match(report.errors.join('\n'), /Missing dependency absent/)
})

test('public files must match source and required manifest must exist', async t => {
  const f = await fixture(t)
  await f.put('duck.png', 'different')
  await rm(resolve(f.directory, '.vite/manifest.json'))
  let report = await f.inspect()
  assert.match(report.errors.join('\n'), /Public file differs/)
  assert.match(report.errors.join('\n'), /Required manifest missing/)
  await rm(resolve(f.directory, 'duck.png'))
  report = await f.inspect({ requireManifest: false })
  assert.match(report.errors.join('\n'), /Public file missing/)
  assert.equal(report.checks.at(-1).status, 'not supplied')
})

test('strict static server returns correct MIME, query, HEAD, redirects and real 404s', async t => {
  const f = await fixture(t)
  const host = await serveStatic([f]); t.after(() => host.close())
  const base = host.origin + f.base
  assert.match(await (await fetch(base)).text(), /type="module"/)
  const js = await fetch(base + 'assets/main.js?v=1')
  assert.match(js.headers.get('content-type'), /javascript/)
  assert.match(js.headers.get('x-content-type-options'), /nosniff/)
  assert.equal(await js.text(), 'import "./chunk.js";')
  const head = await fetch(base + 'assets/font.woff2', { method: 'HEAD' })
  assert.equal(head.status, 200); assert.equal(head.headers.get('content-type'), 'font/woff2'); assert.equal(await head.text(), '')
  const redirect = await fetch(host.origin + '/project?x=1', { redirect: 'manual' })
  assert.equal(redirect.status, 308); assert.equal(redirect.headers.get('location'), '/project/?x=1')
  for (const path of ['apps/application', 'missing.js', 'assets/', 'duck.PNG']) assert.equal((await fetch(base + path)).status, 404)
  assert.equal((await fetch(host.origin + '/assets/main.js')).status, 404)
  assert.equal((await fetch(base + 'assets/main.js', { method: 'POST' })).status, 405)
  assert.ok(host.requests.some(r => r.status === 404))
})

test('strict host prevents traversal, encoded separators and cross-mount leakage', async t => {
  const a = await fixture(t, '/a/'), b = await fixture(t, '/b/')
  await b.put('private-to-b.txt', 'B')
  const host = await serveStatic([a, b]); t.after(() => host.close())
  for (const path of ['/a/../b/private-to-b.txt', '/a/%2e%2e/b/private-to-b.txt', '/a/%2fb/private-to-b.txt', '/a/%5cb', '/a/%00', '/a/%zz']) assert.equal(await rawRequest(host.origin, path), 400, path)
  assert.equal((await fetch(host.origin + '/a/private-to-b.txt')).status, 404)
  assert.equal(await (await fetch(host.origin + '/b/private-to-b.txt')).text(), 'B')
  assert.equal((await fetch(host.origin + '/a-other/index.html')).status, 404)
})

test('strict host refuses symlinked artifact entries', async t => {
  const f = await fixture(t)
  try { await symlink(resolve(f.publicDir, 'duck.png'), resolve(f.directory, 'link.png')) }
  catch (error) { if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) { t.skip('Host does not permit symlinks'); return } throw error }
  await assert.rejects(f.inspect(), /Unsupported artifact entry/)
  await assert.rejects(serveStatic([f]), /Unsupported artifact entry/)
})

test('qualification CLI produces machine-readable reports and fails closed', async t => {
  const f = await fixture(t)
  const script = fileURLToPath(new URL('../../scripts/verify-static.mjs', import.meta.url))
  const reportPath = resolve(f.root, 'report.json')
  const run = () => spawnSync(process.execPath, [script, '--dir', f.directory, '--base', f.base, '--public', f.publicDir, '--require-manifest', '--artifact-only', '--report', reportPath], { encoding: 'utf8' })
  let runResult = run()
  assert.equal(runResult.status, 0, runResult.stderr)
  let report = JSON.parse(await readFile(reportPath, 'utf8'))
  assert.equal(report.passed, true); assert.equal(report.scope, 'artifact-only'); assert.equal(report.browser.status, 'not-run')
  await rm(resolve(f.directory, 'assets/main.js'))
  runResult = run(); assert.equal(runResult.status, 1)
  report = JSON.parse(await readFile(reportPath, 'utf8'))
  assert.equal(report.passed, false); assert.match(report.errors.join('\n'), /Missing asset/)
})
