import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { resolvePublicAsset, resolveMediaAsset, mediaBackgroundImage } from '../../src/utilities/asset-path.mjs'
import { resolveDeployment } from '../../config/deployment.mjs'

const inventory = JSON.parse(readFileSync(new URL('../../docs/artwork/wgp-01/manifest.json', import.meta.url), 'utf8'))
const site = 'https://owner.github.io'

test('all inventory assets resolve under local, Docker, project Pages and custom bases', () => {
  const deployments = [
    resolveDeployment('development'),
    resolveDeployment('docker'),
    resolveDeployment('github-pages', { GITHUB_REPOSITORY: 'owner/project' }),
    resolveDeployment('github-pages', { GITHUB_REPOSITORY: 'owner/owner.github.io' }),
    resolveDeployment('github-pages', { WEBBLOCKS_BASE_PATH: '/docs/site' }),
    resolveDeployment('github-pages', { WEBBLOCKS_BASE_PATH: '' }),
  ]
  for (const { basePath } of deployments) {
    for (const { path } of inventory.assets) {
      for (const input of [path, '/' + path]) {
        const url = resolvePublicAsset(input, basePath)
        assert.equal(url, basePath + path)
        for (const route of ['', '#/apps/application', 'apps/application']) {
          assert.equal(new URL(url, site + basePath + route).href, site + basePath + path)
        }
      }
    }
  }
})

test('public asset paths preserve cache-busting queries, fragments, case and encoded filenames', () => {
  assert.equal(resolvePublicAsset('images/Logo%20Blue.svg?v=2#mark', '/project/'), '/project/images/Logo%20Blue.svg?v=2#mark')
  assert.equal(resolvePublicAsset('images/雪.png', '/project/'), '/project/images/雪.png')
  assert.equal(resolvePublicAsset('project/image.png', '/project/'), '/project/project/image.png')
})

test('public paths reject traversal, malformed encodings, empty paths and nonlocal sources', () => {
  for (const input of ['', '/', '?x', '#x', '../outside.png', './x.png', 'images/../x.png', 'images/%2e%2E/x.png', 'images/%2foutside.png', 'images/%5Coutside.png', 'images/%00.png', 'images/%zz.png', 'images//x.png', 'images/', ' https://example.org/a.png', 'https://example.org/a.png', '//example.org/a.png', 'data:image/png;base64,AA', 'blob:https://example.org/id', 'a\\b.png', 'a\nb.png', undefined]) {
    assert.throws(() => resolvePublicAsset(input, '/project/'), TypeError, String(input))
  }
})

test('noncanonical bases are rejected', () => {
  for (const base of ['', 'project/', '/project', '//project/', '/a/../', '/a/./', '/a//b/', 'https://example.org/', '/a?b/']) {
    assert.throws(() => resolvePublicAsset('duck.png', base), TypeError, base)
  }
})

test('dynamic media preserves explicit remote and browser-generated URLs', () => {
  const urls = ['https://cdn.example.org/flake.png?v=1', 'http://example.org/a.png', '//cdn.example.org/a.png', 'data:image/png;base64,AAAA', 'blob:https://owner.github.io/1234']
  for (const url of urls) assert.equal(resolveMediaAsset(url, '/project/'), url)
  assert.equal(resolveMediaAsset('/duck.png', '/project/'), '/project/duck.png')
  assert.equal(resolveMediaAsset('duck.png', '/project/'), '/project/duck.png')
})

test('dynamic media skips absent, unsupported and invalid local sources', () => {
  for (const value of [undefined, '', ' ', '../x.png', 'javascript:alert(1)', 'file:///tmp/a.png', 'data:text/html,test', 'a\nb.png', 'a\\b.png']) {
    assert.equal(resolveMediaAsset(value, '/project/'), undefined, String(value))
    assert.equal(mediaBackgroundImage(value, '/project/'), undefined, String(value))
  }
})

test('WebFall CSS background output quotes URLs and never emits url(undefined)', () => {
  assert.equal(mediaBackgroundImage('/duck.png', '/project/'), 'url("/project/duck.png")')
  assert.equal(mediaBackgroundImage('https://example.org/a"b.png', '/project/'), 'url("https://example.org/a\\"b.png")')
  assert.equal(mediaBackgroundImage('data:image/svg+xml,%3Csvg%3E', '/project/'), 'url("data:image/svg+xml,%3Csvg%3E")')
  assert.equal(mediaBackgroundImage(undefined, '/project/'), undefined)
})

test('runtime adapter and WebFall use the deployment resolver exactly at the render boundary', () => {
  const adapter = readFileSync(new URL('../../src/utilities/assetUrl.ts', import.meta.url), 'utf8')
  assert.match(adapter, /resolvePublicAsset\(path, import\.meta\.env\.BASE_URL\)/)
  assert.match(adapter, /mediaBackgroundImage\(path, import\.meta\.env\.BASE_URL\)/)
  const effect = readFileSync(new URL('../../src/components/Effects/webfall/webfall.tsx', import.meta.url), 'utf8')
  assert.match(effect, /backgroundImage: p\.kind === "image" \? assetBackgroundImage\(p\.src\) : undefined/)
})
