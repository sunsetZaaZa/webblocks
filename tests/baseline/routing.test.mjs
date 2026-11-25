import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { test } from 'node:test'
import { routes, routeAliases, routingOptions } from '../../src/routing/routes.mjs'
import { resolveDeployment } from '../../config/deployment.mjs'
const read = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')

test('all seven canonical routes are unique and host independent', () => {
  assert.deepEqual(Object.values(routes), ['/', '/apps', '/apps/application', '/about', '/user_privacy', '/software_libraries', '/software_libraries/package'])
  assert.equal(new Set(Object.values(routes)).size, 7)
  const table = read('src/routing/AppRoutes.tsx')
  for (const key of Object.keys(routes)) assert.match(table, new RegExp(`\\b${key}:`))
  assert.match(table, /filter\(pageEnabled\)/)
  assert.match(table, /path=\{routes\[key\]\}/)
})

test('legacy links resolve directly to canonical routes without alias chains', () => {
  assert.deepEqual(routeAliases, { '/apps/app': routes.application, '/userprivacy': routes.privacy, '/software_libaries': routes.libraries })
  for (const [from, to] of Object.entries(routeAliases)) {
    assert.ok(!Object.values(routes).includes(from))
    assert.ok(Object.values(routes).includes(to))
    assert.ok(!Object.hasOwn(routeAliases, to))
  }
  assert.match(read('src/routing/AppRoutes.tsx'), /<Navigate replace to=\{\{ pathname: to, search, hash \}\}/)
})

test('Pages selects hash routing regardless of root or repository base', () => {
  for (const env of [{ GITHUB_REPOSITORY: 'owner/project' }, { GITHUB_REPOSITORY: 'owner/owner.github.io' }, { WEBBLOCKS_BASE_PATH: '/docs/site' }]) {
    const d = resolveDeployment('github-pages', env)
    assert.deepEqual(routingOptions(d.profile, d.basePath), { kind: 'hash' })
    for (const route of Object.values(routes)) {
      const url = new URL(`https://owner.github.io${d.basePath}#${route}?q=1`)
      assert.equal(url.pathname, d.basePath)
      assert.equal(url.hash, `#${route}?q=1`)
    }
  }
})

test('local and Docker retain browser routing with correct basename', () => {
  assert.deepEqual(routingOptions('local', '/'), { kind: 'browser', basename: '/' })
  assert.deepEqual(routingOptions('local', '/docs/site/'), { kind: 'browser', basename: '/docs/site/' })
  assert.deepEqual(routingOptions('docker', '/'), { kind: 'browser', basename: '/' })
  assert.throws(() => routingOptions('unknown', '/'), /Unsupported/)
  const router = read('src/routing/DeploymentRouter.tsx')
  assert.match(router, /<HashRouter>\{children\}<\/HashRouter>/)
  assert.match(router, /<BrowserRouter basename=\{options.basename\}>/)
})

test('production navigation uses shared route keys, not literal paths', () => {
  const root = new URL('../../src/', import.meta.url)
  let count = 0
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir)
      if (entry.isDirectory()) { if (entry.name !== 'test') walk(url); continue }
      if (!entry.name.endsWith('.tsx')) continue
      const text = readFileSync(url, 'utf8')
      assert.doesNotMatch(text, /\bto\s*=\s*['"]\//, url.pathname)
      for (const [, key] of text.matchAll(/\bto=\{routes\.(\w+)\}/g)) { assert.ok(Object.hasOwn(routes, key), key); count++ }
    }
  }
  walk(root)
  assert.equal(count, 6)
  assert.match(read('src/components/NavGuide/NavGuide.tsx'), /siteContent.navigation.map/)
  assert.match(read('src/components/NavGuide/NavGuide.tsx'), /to=\{routes\[page\]\}/)
})

test('unknown routes show a recovery page and preserve the application shell', () => {
  const source = read('src/routing/AppRoutes.tsx')
  assert.match(source, /<Route path="\*" element=\{<NotFound \/>\}/)
  assert.match(source, /<Link to=\{routes.home\}>Return to homepage/)
  const app = read('src/App.tsx')
  assert.match(app, /<FallingSquares[\s\S]*<DeploymentRouter>\s*<AppRoutes \/>/)
})

test('Docker configuration includes SPA fallback and explicit missing asset handling', () => {
  const config = read('config/nginx/default.conf')
  assert.match(config, /try_files \$uri \$uri\/ \/index\.html;/)
  assert.match(config, /location ~\* \^\/\(assets\|characters\|controller\|gen_util\)/)
  assert.equal([...config.matchAll(/try_files \$uri =404;/g)].length, 2)
  assert.match(read('Dockerfile'), /COPY config\/nginx\/default\.conf \/etc\/nginx\/sites-enabled\/default/)
})
