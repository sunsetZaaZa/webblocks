import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
import { createStarter, initializeClone, starterFiles, templateFiles } from '../../scripts/init-site.mjs'
import { loadSiteConfig, resolveSiteConfig, validateSiteConfig } from '../../config/site-config.mjs'
import { loadSiteContent } from '../../config/site-content.mjs'
import { loadEditorDefaults } from '../../config/editor-defaults.mjs'
import { defaultContent } from '../../site/default-content.mjs'
const root = fileURLToPath(new URL('../../', import.meta.url))
const options = { owner: 'Webblocks', repo: 'Grid', title: 'Adaptive Grid', description: 'Puzzle framework' }
const read = path => readFileSync(path, 'utf8')
const json = data => JSON.stringify(data, null, 2) + '\n'
function temp(t) {
  const dir = mkdtempSync(join(tmpdir(), 'webblocks-template-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}
function cloneFixture(t) {
  const dir = temp(t)
  mkdirSync(join(dir, 'site'))
  writeFileSync(join(dir, 'webblocks.config.json'), json(validateSiteConfig()))
  writeFileSync(join(dir, 'site/content.json'), json(defaultContent))
  return dir
}
test('starter config is repository-specific, validated and stable across profiles', () => {
  const a = starterFiles(options), b = starterFiles({ ...options, repo: 'Vault', title: 'Vault', storybook: false, editor: false, roster: 'demo' })
  assert.equal(a.siteId, 'github:webblocks/grid')
  assert.equal(a.basePath, '/Grid/')
  assert.equal(b.siteId, 'github:webblocks/vault')
  assert.equal(b.files.has('webblocks.defaults.json'), false)
  const config = JSON.parse(b.files.get('webblocks.config.json'))
  assert.equal(config.storybook.publish, false)
  assert.equal(config.editor.enabled, false)
  assert.equal(resolveSiteConfig(config, 'production').deployment.basePath, '/')
  assert.equal(resolveSiteConfig(config, 'docker').siteId, b.siteId)
  assert.equal(starterFiles({ ...options, repo: 'webblocks.github.io' }).basePath, '/')
  assert.equal(JSON.parse(a.files.get('site/content.json')).pages.home.heading, 'Adaptive Grid')
  for (const bad of [{ owner: '../bad' }, { repo: '../bad' }, { repo: '.' }, { title: '' }, { language: 'not_a_locale' }, { roster: 'bad' }, { storybook: 'false' }]) assert.throws(() => starterFiles({ ...options, ...bad }))
})
test('manifest includes deployment, tests, dependencies, docs and initializer without site-owned or private files', () => {
  const paths = templateFiles(root)
  for (const file of ['.github/workflows/ci.yml', '.github/workflows/deploy-pages.yml', '.github/workflows/reusable-build.yml', '.github/workflows/reusable-pages.yml', 'tests/baseline/reusable-workflows.test.mjs', 'bun.lock', 'LICENSE', 'scripts/init-site.mjs', 'tests/baseline/repository-template.test.mjs', 'site/template-files.json']) assert.ok(paths.includes(file), file)
  for (const file of ['webblocks.config.json', 'site/content.json', 'webblocks.defaults.json', '.env.local', '.git/config']) assert.ok(!paths.includes(file), file)
  assert.ok(paths.length > 200)
})
test('create installs the complete framework with valid defaults and preserves unrelated existing files', t => {
  const dir = temp(t), target = join(dir, 'project')
  mkdirSync(target); mkdirSync(join(target, '.git')); writeFileSync(join(target, '.git/config'), 'keep git'); writeFileSync(join(target, 'existing.txt'), 'keep')
  const result = createStarter(target, options)
  for (const file of templateFiles(root)) assert.deepEqual(readFileSync(join(target, file)), readFileSync(join(root, file)), file)
  assert.equal(read(join(target, 'existing.txt')), 'keep')
  assert.equal(read(join(target, '.git/config')), 'keep git')
  const config = join(target, 'webblocks.config.json')
  assert.equal(resolveSiteConfig(loadSiteConfig(config), 'github-pages').siteId, result.siteId)
  const content = loadSiteContent(config, join(target, 'public'))
  assert.deepEqual(content.enabledPages, ['home'])
  assert.equal(content.pages.home.hero, 'Puzzle framework')
  assert.equal(loadEditorDefaults(config, result.siteId).characterTracker.length, 8)
  assert.ok(loadEditorDefaults(config, result.siteId).characterTracker.every(entry => entry.chars.length === 0))
  assert.ok(existsSync(join(target, 'public/project')))
  assert.throws(() => createStarter(target, options), /collision/)
})
test('preflight refuses file, directory and case collisions before any framework write', t => {
  const dir = temp(t)
  for (const name of ['package.json', 'README.MD', 'src', 'webblocks.defaults.json']) {
    const target = join(dir, `case-${name.replaceAll('.', '-')}`)
    mkdirSync(target); writeFileSync(join(target, name), 'existing')
    assert.throws(() => createStarter(target, options), /collision/)
    assert.deepEqual(readdirSync(target), [name])
    assert.equal(read(join(target, name)), 'existing')
  }
  assert.throws(() => createStarter(join(root, 'new-site'), options), /outside/)
  assert.throws(() => createStarter(join(dir, 'missing', 'site'), options), /parent/)
  assert.deepEqual(readdirSync(dir).sort(), ['case-README-MD', 'case-package-json', 'case-src', 'case-webblocks-defaults-json'].sort())
})
test('symlink destination and nested symlink directories are refused', { skip: process.platform === 'win32' }, t => {
  const dir = temp(t), outside = join(dir, 'outside'), target = join(dir, 'target')
  mkdirSync(outside); symlinkSync(outside, target)
  assert.throws(() => createStarter(target, options), /collision/)
  rmSync(target); mkdirSync(target); symlinkSync(outside, join(target, '.github'))
  assert.throws(() => createStarter(target, options), /collision/)
  assert.deepEqual(readdirSync(outside), [])
})
test('fresh clone initialization only replaces pristine demonstration configuration and cannot be repeated', t => {
  const dir = cloneFixture(t)
  const result = initializeClone(dir, options)
  assert.equal(result.siteId, 'github:webblocks/grid')
  const saved = read(join(dir, 'webblocks.config.json'))
  assert.throws(() => initializeClone(dir, { ...options, repo: 'other' }), /customized/)
  assert.equal(read(join(dir, 'webblocks.config.json')), saved)
  assert.ok(existsSync(join(dir, 'public/project')))
})
test('customized clone content or existing editor exports are never replaced', t => {
  const dir = cloneFixture(t)
  const config = read(join(dir, 'webblocks.config.json'))
  writeFileSync(join(dir, 'site/content.json'), '{"custom":true}')
  assert.throws(() => initializeClone(dir, options), /customized site\/content/)
  assert.equal(read(join(dir, 'webblocks.config.json')), config)
  writeFileSync(join(dir, 'site/content.json'), json(defaultContent))
  writeFileSync(join(dir, 'webblocks.defaults.json'), 'existing export')
  assert.throws(() => initializeClone(dir, options), /collision/)
  assert.equal(read(join(dir, 'webblocks.defaults.json')), 'existing export')
  assert.equal(read(join(dir, 'webblocks.config.json')), config)
})
test('CLI creates a starter, supports help and fails without writing on invalid arguments', t => {
  const dir = temp(t), target = join(dir, 'my-site')
  const cli = (...args) => spawnSync(process.execPath, [join(root, 'scripts/init-site.mjs'), ...args], { encoding: 'utf8' })
  assert.match(cli('--help').stdout, /Usage:/)
  const bad = cli('create', '--destination', target, '--owner', 'owner', '--repo', 'repo', '--storybook', 'maybe')
  assert.notEqual(bad.status, 0); assert.equal(existsSync(target), false)
  const result = cli('create', '--destination', target, '--owner', 'owner', '--repo', 'repo', '--roster', 'demo', '--storybook', 'false')
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /github:owner\/repo/)
  assert.equal(existsSync(join(target, 'webblocks.defaults.json')), false)
  assert.equal(loadSiteConfig(join(target, 'webblocks.config.json')).storybook.publish, false)
})


test('a customized source cannot leak local settings, exports or unlisted files into a new site', t => {
  const dir = temp(t), source = join(dir, 'source'), target = join(dir, 'target')
  createStarter(source, options)
  writeFileSync(join(source, '.env.local'), 'PRIVATE_VALUE=do-not-copy')
  writeFileSync(join(source, 'public/project/private.txt'), 'do not publish')
  writeFileSync(join(source, 'webblocks.defaults.json'), 'source-only export')
  writeFileSync(join(source, 'site/content.json'), '{"source-only":true}')
  const result = createStarter(target, { owner: 'other', repo: 'new-site', roster: 'demo' }, source)
  assert.equal(result.siteId, 'github:other/new-site')
  for (const path of ['.env.local', 'public/project/private.txt', 'webblocks.defaults.json']) assert.equal(existsSync(join(target, path)), false)
  assert.equal(loadSiteContent(join(target, 'webblocks.config.json'), join(target, 'public')).pages.home.heading, 'new-site')
})
