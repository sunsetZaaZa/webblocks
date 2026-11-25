import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { createBuildFixture } from '../deployment/support/build-fixture.mjs'
import { normalizeBasePath, repositoryBasePath, resolveDeployment } from '../../config/deployment.mjs'

const pages = env => resolveDeployment('github-pages', env)

test('ordinary dev and production modes preserve root deployment even on GitHub Actions', () => {
  for (const mode of ['development', 'production', 'test', 'local']) {
    assert.deepEqual(resolveDeployment(mode, { GITHUB_REPOSITORY: 'owner/project' }), {
      profile: 'local', basePath: '/', source: 'default',
    })
  }
})

test('Docker profile preserves the document root and rejects an unsupported nested mount', () => {
  assert.deepEqual(resolveDeployment('docker'), { profile: 'docker', basePath: '/', source: 'default' })
  assert.throws(() => resolveDeployment('docker', { WEBBLOCKS_BASE_PATH: '/nested' }), /Docker profile/)
})

test('Pages derives repository paths and supports user and organization sites', () => {
  for (const [repo, path] of [['owner/Project-1.0', '/Project-1.0/'], ['owner/owner.github.io', '/'], ['Org/ORG.github.io', '/']]) {
    assert.deepEqual(pages({ GITHUB_REPOSITORY: repo }), { profile: 'github-pages', basePath: path, source: 'repository' })
  }
})

test('explicit Pages metadata overrides inferred paths including custom-domain roots', () => {
  for (const [base, expected] of [['', '/'], ['/', '/'], ['/docs', '/docs/'], ['/docs/project/', '/docs/project/']]) {
    assert.deepEqual(pages({ WEBBLOCKS_BASE_PATH: base, GITHUB_REPOSITORY: 'owner/repo' }), {
      profile: 'github-pages', basePath: expected, source: 'explicit',
    })
  }
  assert.equal(pages({ WEBBLOCKS_BASE_PATH: 'auto', GITHUB_REPOSITORY: 'owner/repo' }).basePath, '/repo/')
  assert.equal(pages({ WEBBLOCKS_BASE_PATH: '/manual' }).basePath, '/manual/')
})

test('profile override is supported outside named modes and conflicts fail closed', () => {
  assert.equal(resolveDeployment('production', { WEBBLOCKS_DEPLOYMENT: 'github-pages', GITHUB_REPOSITORY: 'owner/repo' }).basePath, '/repo/')
  assert.equal(resolveDeployment('production', { WEBBLOCKS_DEPLOYMENT: 'docker' }).profile, 'docker')
  assert.equal(resolveDeployment('local', { WEBBLOCKS_DEPLOYMENT: 'local' }).profile, 'local')
  for (const value of ['', 'pages', 'GitHub-Pages']) assert.throws(() => resolveDeployment('production', { WEBBLOCKS_DEPLOYMENT: value }), /WEBBLOCKS_DEPLOYMENT/)
  assert.throws(() => resolveDeployment('docker', { WEBBLOCKS_DEPLOYMENT: 'github-pages' }), /conflicts/)
})

test('malformed base paths fail rather than silently changing the deployment location', () => {
  for (const value of ['relative', './', '//evil.example', '/a//b', '/a//', '/a/../b', '/./x', '/%2e%2e/', '/a?x=1', '/a#b', '/a\\b', '/a b', '/a\n', 'https://host/repo', '']) {
    assert.throws(() => normalizeBasePath(value), /WEBBLOCKS_BASE_PATH/, JSON.stringify(value))
  }
  assert.equal(normalizeBasePath('/.well-known/my_repo-1.0'), '/.well-known/my_repo-1.0/')
  assert.throws(() => resolveDeployment('production', { WEBBLOCKS_BASE_PATH: '' }), /WEBBLOCKS_BASE_PATH/)
})

test('missing or invalid repository metadata cannot create a guessed Pages build', () => {
  for (const value of [undefined, '', 'repo', 'owner/', '/repo', 'owner/repo/subdir', 'owner/..', 'owner/repo?foo']) {
    assert.throws(() => repositoryBasePath(value), /GITHUB_REPOSITORY/, String(value))
  }
  assert.throws(() => pages({}), /GITHUB_REPOSITORY/)
})

// Reproduce the macOS /var -> /private/var alias without depending on macOS.
test('Vite build fixtures use physical paths even when the temporary parent is aliased', t => {
  const workspace = createBuildFixture('webblocks-fixture-path-')
  t.after(() => rmSync(workspace, { recursive: true, force: true }))
  const physical = join(workspace, 'physical')
  const alias = join(workspace, 'alias')
  mkdirSync(physical)
  symlinkSync(physical, alias, 'junction')
  const fixture = createBuildFixture('site-', alias)
  const entry = join(fixture, 'index.html')
  writeFileSync(entry, '<!doctype html>')
  assert.equal(dirname(fixture), realpathSync(physical))
  assert.equal(fixture, realpathSync(fixture))
  assert.equal(relative(fixture, realpathSync(entry)), 'index.html')
})
