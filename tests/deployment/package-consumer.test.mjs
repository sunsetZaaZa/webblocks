import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, rmSync, symlinkSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
import { createBuildFixture } from './support/build-fixture.mjs'
import { installFramework } from './support/bun-package.mjs'
import { packFramework } from '../../scripts/pack-framework.mjs'
import { serveStatic } from './support/static-host.mjs'
import { build } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { chromium } from 'playwright'

const root = fileURLToPath(new URL('../../', import.meta.url))
// Use the real packed npm dependency in an independent project. Existing locked
// CI dependencies are linked into the fixture to avoid a second registry install.
test('packed React components render from a nested static deployment', async t => {
  mkdirSync(join(root, 'test-results'), { recursive: true })
  const dir = createBuildFixture('package-consumer-', join(root, 'test-results'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const { archive, manifest } = packFramework(join(dir, 'package'))
  writeFileSync(join(dir, 'package.json'), '{"name":"consumer","private":true,"type":"module"}')
  installFramework(dir, archive, manifest)
  for (const dep of ['react', 'react-dom', 'vite', 'sass', '@types']) symlinkSync(join(root, 'node_modules', dep), join(dir, 'node_modules', dep), 'junction')
  mkdirSync(join(dir, 'public'))
  writeFileSync(join(dir, 'public/duck.png'), readFileSync(join(root, 'public/duck.png')))
  writeFileSync(join(dir, 'index.html'), '<!doctype html><html><head><link rel="icon" href="data:,"></head><body><div id="root"></div><script type="module" src="/main.tsx"></script></body></html>')
  writeFileSync(join(dir, 'main.tsx'), `import { createRoot } from 'react-dom/client'; import { SemanticButton, FallingSquares, Embers, WebFall } from '@webblocks/webblocks/components'; import { resolvePublicAsset } from '@webblocks/webblocks/assets'; import duck from '@webblocks/webblocks/public/duck.png'; createRoot(document.getElementById('root')!).render(<><SemanticButton>Package button</SemanticButton><FallingSquares mobileCount={2} desktopCount={2}/><Embers count={2}/><WebFall count={1} variants={[{kind:'image',srcs:['duck.png']}]}/><img alt="Bundled artwork" src={duck}/><img alt="Public artwork" src={resolvePublicAsset('duck.png',import.meta.env.BASE_URL)}/></>);`)
  writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target:'ES2020', module:'ESNext', moduleResolution:'bundler', jsx:'react-jsx', noEmit:true, strict:false, skipLibCheck:true, types:['vite/client'] }, include:['main.tsx'] }))
  const types = spawnSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '-p', join(dir, 'tsconfig.json')], { cwd: dir, encoding: 'utf8' })
  assert.equal(types.status, 0, types.stdout + types.stderr)
  await build({ root: dir, configFile: false, base: '/consumer/', plugins: [react()], build: { outDir: 'dist' }, resolve: { dedupe: ['react', 'react-dom'] } })
  const host = await serveStatic([{ base: '/consumer/', directory: join(dir, 'dist') }])
  t.after(() => host.close())
  const browser = await chromium.launch(); t.after(() => browser.close())
  const page = await browser.newPage(); const errors = []
  page.on('pageerror', error => errors.push(error.message)); page.on('requestfailed', req => errors.push(req.url())); page.on('response', res => { if (res.status() >= 400) errors.push(`${res.status()} ${res.url()}`) })
  await page.goto(`${host.origin}/consumer/`)
  await page.getByRole('button', { name: 'Package button' }).waitFor()
  await page.waitForFunction(() => Array.from(document.images).length === 2 && Array.from(document.images).every(img => img.complete && img.naturalWidth > 0))
  assert.equal(await page.locator('.webfall__item').count(), 1)
  assert.match(await page.locator('.webfall__item').evaluate(el => getComputedStyle(el).backgroundImage), /\/consumer\/duck\.png/)
  assert.equal(await page.locator('.webfall').evaluate(el => getComputedStyle(el).pointerEvents), 'none')
  assert.deepEqual(errors, [])
})
