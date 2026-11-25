import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { readBunLock, assertManifestLock, reviewLock } from '../../scripts/security-review.mjs'
import { defaultContent } from '../../site/default-content.mjs'
import { resolvePublicAsset } from '../../src/utilities/asset-path.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const read = (path) => readFileSync(join(root, path), 'utf8')
const json = (path) => JSON.parse(read(path))
const manifest = json('docs/artwork/wgp-01/manifest.json')

function* files(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, item.name)
    if (item.isDirectory()) yield* files(path)
    else if (item.isFile()) yield path
  }
}

function publicAssetReferences(source) {
  // Targeted literal audit, not a JS parser. Runtime values are tested separately.
  return [...source.matchAll(/\bassetUrl\(\s*(['"])([^'"\r\n]+)\1\s*\)/g)]
    .map(match => match[2])
}

test('all static public asset references resolve to actual files', () => {
  const references = new Set()
  for (const file of files(join(root, 'src'))) {
    if (!/\.(?:tsx?|css|scss)$/.test(file)) continue
    for (const path of publicAssetReferences(readFileSync(file, 'utf8'))) {
      references.add(path)
      assert.equal(path.startsWith('/'), false, `${relative(root, file)}: use unprefixed paths`)
      const pathname = resolvePublicAsset(path, '/').split(/[?#]/, 1)[0]
      const target = join(root, 'public', decodeURIComponent(pathname.slice(1)))
      assert.ok(existsSync(target) && statSync(target).isFile(), `${relative(root, file)}: missing public/${path}`)
    }
  }
  for (const path of [defaultContent.pages.apps.icon, defaultContent.pages.application.image]) {
    references.add(path)
    assert.ok(statSync(join(root, 'public', path)).isFile(), path)
  }
  assert.ok(references.size > 0, 'asset reference scan must not pass vacuously')
  for (const item of manifest.assets) assert.ok(references.has(item.path), `missing usage of ${item.path}`)
})

test('runtime source does not bypass the deployment base with literal root asset URLs', () => {
  const extension = '(?:png|jpe?g|svg|gif|webp|ico|avif|woff2?|ttf|otf|mp4|webm|mp3|ogg|wav|pdf)'
  const quoted = new RegExp(`["'\\x60]/(?!/)[^"'\\x60\\s]+\\.${extension}(?:[?#][^"'\\x60]*)?["'\\x60]`, 'gi')
  const css = /url\(\s*['"]?\/(?!\/)[^)]*\)/gi
  for (const file of files(join(root, 'src'))) {
    if (!/\.(?:tsx?|css|scss)$/.test(file)) continue
    const source = readFileSync(file, 'utf8')
    assert.deepEqual(source.match(quoted), null, `${relative(root, file)}: use assetUrl() instead of root literals`)
    if (/\.(?:css|scss)$/.test(file)) {
      assert.deepEqual(source.match(css), null, `${relative(root, file)}: use Vite-managed relative stylesheet assets`)
    }
  }
})

test('WGP-01 inventory covers all twelve missing images and their editable artwork sources', () => {
  assert.equal(manifest.schemaVersion, 1)
  assert.equal(manifest.assets.length, 12)
  assert.equal(new Set(manifest.assets.map((item) => item.path)).size, 12)
  assert.equal(manifest.assets.filter((item) => item.status === 'temporary-artwork').length, 4)
  for (const item of manifest.assets) {
    assert.ok(['replacement-icon', 'temporary-artwork'].includes(item.status))
    const png = readFileSync(join(root, 'public', item.path))
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', item.path)
    assert.equal(png.subarray(12, 16).toString('ascii'), 'IHDR', item.path)
    assert.ok(png.readUInt32BE(16) > 0 && png.readUInt32BE(20) > 0, item.path)
    assert.match(read(item.source), /<svg\b/)
    if (item.status === 'temporary-artwork') assert.match(read(item.source), /PLACEHOLDER/)
  }
})

test('relative font URLs used by the main stylesheet resolve', () => {
  const cssPath = join(root, 'src/index.css')
  const matches = [...readFileSync(cssPath, 'utf8').matchAll(/url\(['"](\.\/[^'"]+)['"]\)/g)]
  assert.ok(matches.length > 0, 'font URL scan must not pass vacuously')
  for (const [, url] of matches) {
    const target = resolve(dirname(cssPath), url)
    assert.ok(existsSync(target) && statSync(target).size > 0, `missing font ${url}`)
  }
})

test('Bun lock metadata and root dependency declarations match the package manifest', () => {
  const pkg = json('package.json')
  const lock = readBunLock(root)
  assertManifestLock(pkg, lock)
  assert.equal(pkg.packageManager, `bun@${read('.bun-version').trim()}`)
  assert.equal(pkg.engines.bun, read('.bun-version').trim())
  assert.equal(existsSync(join(root, 'package-lock.json')), false)
  assert.equal(existsSync(join(root, '.nvmrc')), false)
  assert.ok(reviewLock(lock).components.length > 0)
})

test('Storybook baseline has a config, preview, isolated Vite config and provider harness', () => {
  for (const file of ['.storybook/main.ts', '.storybook/preview.tsx', '.storybook/preview.css', '.storybook/vite.config.ts', 'src/test/storybook/StorybookProviders.stories.tsx']) {
    assert.ok(read(file).trim().length > 0, file)
  }
  assert.match(read('.storybook/main.ts'), /staticDirs: \['\.\.\/public'\]/)
  assert.match(read('.storybook/preview.tsx'), /withReduxStore, withRouter, withPressedRootSurface/)
})

test('Storybook fixtures reference existing page and character enum members', () => {
  function enumMembers(path, name) {
    const body = read(path).match(new RegExp(`enum ${name}\\s*\\{([^}]+)\\}`))[1]
    return new Set([...body.matchAll(/\b(\w+)\s*=/g)].map((match) => match[1]))
  }
  const models = {
    UIBranch: enumMembers('src/state-management/models/UIBranch.ts', 'UIBranch'),
    CharacterType: enumMembers('src/components/Characters/CharacterMetadata.ts', 'CharacterType'),
  }
  let count = 0
  for (const path of files(join(root, 'src/test/storybook'))) {
    if (!/\.tsx?$/.test(path)) continue
    for (const [, name, member] of readFileSync(path, 'utf8').matchAll(/\b(UIBranch|CharacterType)\.(\w+)\b/g)) {
      count++
      assert.ok(models[name].has(member), `${relative(root, path)}: ${name}.${member} is absent`)
    }
  }
  assert.ok(count > 0)
})

test('unit and Storybook test projects cannot silently pass an empty suite', () => {
  assert.match(read('vitest.config.ts'), /test: \{\s*passWithNoTests: false,\s*projects:/)
  assert.doesNotMatch(read('vitest.config.ts'), /passWithNoTests: true/)
  assert.equal(read('vitest.config.ts').match(/passWithNoTests:/g).length, 1)
  assert.match(read('vitest.storybook.config.ts'), /passWithNoTests: false/)
  const scripts = json('package.json').scripts
  assert.doesNotMatch(scripts['test:unit'], /passWithNoTests/)
  assert.doesNotMatch(scripts['test:storybook'], /passWithNoTests/)
  assert.match(scripts['test:visual'], /--project visual --passWithNoTests$/)
  assert.match(scripts.test, /test:baseline.*test:unit/)
  assert.match(scripts['test:all'], /test:baseline/)
})
