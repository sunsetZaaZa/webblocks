import assert from 'node:assert/strict'
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { createBuildFixture } from './support/build-fixture.mjs'
import { runInNewContext } from 'node:vm'
import { build, resolveConfig } from 'vite'

const configFile = fileURLToPath(new URL('../../vite.config.ts', import.meta.url))

// Exercise the actual application's Vite configuration with a small fixture.
// Full application builds and strict static serving are separate gates.
test('Vite compiles the expected public base and profile for each deployment', async t => {
  const root = createBuildFixture('webblocks-deployment-')
  const keys = ['WEBBLOCKS_DEPLOYMENT', 'WEBBLOCKS_BASE_PATH', 'GITHUB_REPOSITORY', 'WEBBLOCKS_CONFIG_FILE']
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]))
  t.after(async () => {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
    await rm(root, { recursive: true, force: true })
  })
  const sitePath = join(root, 'webblocks.config.json')
  process.env.WEBBLOCKS_CONFIG_FILE = sitePath
  await writeFile(sitePath, JSON.stringify({ site: { title: 'Fixture & site', description: 'Build <fixture>', language: 'fr-CA' }, features: { effects: false } }))
  await mkdir(join(root, 'public'))
  await writeFile(join(root, 'index.html'), '<!doctype html><html lang="en"><head><title>Default</title><meta name="description" content="" /></head><body><script type="module" src="/main.js"></script></body></html>')
  // Build the real runtime adapter, not an independently reimplemented resolver.
  for (const name of ['assetUrl.ts', 'asset-path.mjs']) {
    await copyFile(new URL(`../../src/utilities/${name}`, import.meta.url), join(root, name))
  }
  await copyFile(new URL('../../public/duck.png', import.meta.url), join(root, 'public', 'duck.png'))
  await writeFile(join(root, 'main.js'), `import './style.css';
    import { assetUrl, assetBackgroundImage } from './assetUrl.ts';
    document.body.dataset.base = import.meta.env.BASE_URL;
    document.body.dataset.profile = __WEBBLOCKS_DEPLOYMENT__;
    document.body.dataset.siteId = __WEBBLOCKS_SITE__.siteId;
    document.body.dataset.effects = __WEBBLOCKS_SITE__.features.effects;
    document.body.dataset.defaults = __WEBBLOCKS_EDITOR_DEFAULTS__;
    document.body.dataset.image = assetUrl('duck.png');
    document.body.dataset.effect = assetBackgroundImage('/duck.png');
    document.body.dataset.external = assetBackgroundImage('https://example.org/flake.png');`)

  await writeFile(join(root, 'style.css'), 'body { background-image: url("./image.svg"); }')
  await writeFile(join(root, 'image.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8"/></svg>')
  await writeFile(join(root, 'public', 'marker.txt'), 'public asset')

  const cases = [
    { mode: 'production', profile: 'local', repo: 'owner/project', base: '/', configured: 'auto' },
    { mode: 'docker', profile: 'docker', repo: 'owner/project', base: '/', configured: 'auto' },
    { mode: 'github-pages', profile: 'github-pages', repo: 'owner/project', base: '/project/', configured: 'auto' },
    { mode: 'github-pages', profile: 'github-pages', repo: 'owner/owner.github.io', base: '/', configured: 'auto' },
    { mode: 'github-pages', profile: 'github-pages', repo: 'owner/project', base: '/', configured: '' },
    { mode: 'github-pages', profile: 'github-pages', repo: 'owner/project', base: '/docs/site/', configured: '/docs/site' },
  ]
  for (const [i, entry] of cases.entries()) {
    await t.test(`${entry.mode}: ${entry.repo} at ${entry.base}`, async () => {
      process.env.WEBBLOCKS_DEPLOYMENT = entry.profile
      process.env.WEBBLOCKS_BASE_PATH = entry.configured
      process.env.GITHUB_REPOSITORY = entry.repo
      const defaults = { characterTracker: Array.from({ length: 8 }, (_, index) => ({ page: index + 1, chars: [] })), menuFields: { targetFPS: 45, showFPS: false, runLength: 10, nonStop: false }, settingsFields: { juggleAnimationBounding: false } }
      await writeFile(join(root, 'webblocks.defaults.json'), JSON.stringify({ format: 'webblocks-editor-config', schemaVersion: 1, siteId: `github:${entry.repo.toLowerCase()}`, data: defaults }))
      const outDir = join(root, `dist-${i}`)
      const options = { configFile, root, mode: entry.mode, logLevel: 'silent' }
      const config = await resolveConfig(options, 'build', 'production', 'production')
      assert.equal(config.base, entry.base)
      assert.equal(config.define.__WEBBLOCKS_DEPLOYMENT__, JSON.stringify(entry.profile))
      await build({ ...options, build: { outDir, assetsInlineLimit: 0, minify: false, modulePreload: false } })
      const html = await readFile(join(outDir, 'index.html'), 'utf8')
      assert.match(html, /<html lang="fr-CA">/)
      assert.match(html, /<title>Fixture &amp; site<\/title>/)
      assert.match(html, /content="Build &lt;fixture&gt;"/)
      const urls = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(match => match[1])
      assert.equal(urls.length, 2, html)
      for (const url of urls) {
        assert.ok(url.startsWith(`${entry.base}assets/`), url)
        assert.ok((await readFile(join(outDir, url.slice(entry.base.length)))).length > 0)
      }
      const assets = await readdir(join(outDir, 'assets'))
      const js = await readFile(join(outDir, 'assets', assets.find(name => name.endsWith('.js'))), 'utf8')
      const css = await readFile(join(outDir, 'assets', assets.find(name => name.endsWith('.css'))), 'utf8')
      const image = assets.find(name => name.endsWith('.svg'))
      assert.ok(image, 'fixture SVG must be emitted')
      assert.ok(css.includes(`${entry.base}assets/${image}`), css)
      assert.ok(js.includes(JSON.stringify(entry.base)), js)
      assert.ok(js.includes(JSON.stringify(entry.profile)), js)
      assert.equal(await readFile(join(outDir, 'marker.txt'), 'utf8'), 'public asset')
      // Execute this single-entry fixture (not a browser test). Module preload
      // is disabled above so the generated script needs only the dataset stub.
      const dataset = {}
      runInNewContext(js, { document: { body: { dataset } } })
      assert.equal(dataset.base, entry.base)
      assert.equal(dataset.profile, entry.profile)
      assert.equal(dataset.siteId, `github:${entry.repo.toLowerCase()}`)
      assert.equal(dataset.effects, false)
      assert.equal(JSON.stringify(dataset.defaults), JSON.stringify(defaults))
      assert.equal(dataset.image, `${entry.base}duck.png`)
      assert.equal(dataset.effect, `url("${entry.base}duck.png")`)
      assert.equal(dataset.external, 'url("https://example.org/flake.png")')
      assert.deepEqual(await readFile(join(outDir, dataset.image.slice(entry.base.length))),
        await readFile(new URL('../../public/duck.png', import.meta.url)))
    })
  }
})
