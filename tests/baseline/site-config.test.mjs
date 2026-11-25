import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { loadSiteConfig, validateSiteConfig, resolveSiteConfig, renderSiteMetadata } from '../../config/site-config.mjs'
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
const config = validateSiteConfig()
const checkedInConfig = JSON.parse(read('webblocks.config.json'))

test('checked-in configuration and missing optional config preserve defaults', t => {
  const dir = mkdtempSync(join(tmpdir(), 'webblocks-site-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  assert.doesNotThrow(() => validateSiteConfig(checkedInConfig))
  assert.deepEqual(validateSiteConfig(config), validateSiteConfig())
  assert.deepEqual(loadSiteConfig(join(dir, 'absent.json'), { optional: true }), validateSiteConfig())
  assert.throws(() => loadSiteConfig(join(dir, 'absent.json')), /Cannot read/)
  const resolved = resolveSiteConfig(config, 'production')
  assert.equal(resolved.siteId, 'webblocks.local')
  assert.deepEqual(resolved.features, { characters: true, effects: true, animations: true })
  assert.deepEqual(resolved.editor, { enabled: true, persistence: 'local' })
  assert.equal(resolved.deployment.profile, 'local')
  assert.equal(resolved.deployment.basePath, '/')
})

test('partial configuration is merged without mutating input or defaults', () => {
  const input = { site: { title: 'Example', language: 'fr-ca' }, features: { effects: false } }
  const snapshot = structuredClone(input)
  const result = validateSiteConfig(input)
  assert.equal(result.site.language, 'fr-CA')
  assert.equal(result.site.title, 'Example')
  assert.equal(result.site.description, config.site.description)
  assert.deepEqual(result.features, { characters: true, effects: false, animations: true })
  assert.deepEqual(input, snapshot)
  assert.equal(validateSiteConfig().features.effects, true)
})

test('malformed JSON and unknown or invalid fields fail with field context', t => {
  const dir = mkdtempSync(join(tmpdir(), 'webblocks-site-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const path = join(dir, 'site.json')
  writeFileSync(path, '{ invalid')
  assert.throws(() => loadSiteConfig(path, { optional: true }), /Invalid JSON/)
  const cases = [
    [null, /root/], [[], /root/], [{ schemaVersion: 2 }, /schemaVersion/],
    [{ secret: 'no' }, /root.secret/], [JSON.parse('{"__proto__":{}}'), /__proto__/],
    [{ siteId: 'bad key' }, /siteId/], [{ siteId: 'valid\n' }, /siteId/], [{ site: { title: '' } }, /site.title/],
    [{ site: { description: 2 } }, /site.description/], [{ site: { language: 'not_a_locale' } }, /site.language/],
    [{ repository: { owner: 'owner', name: 'repo/evil' } }, /repository/], [{ repository: { owner: 'owner' } }, /repository/],
    [{ deployment: { target: 'server' } }, /deployment.target/], [{ deployment: { basePath: '/..' } }, /BASE_PATH/],
    [{ deployment: { basePath: '/x\n' } }, /deployment.basePath/], [{ deployment: { target: 'docker', basePath: '/repo' } }, /deployment.basePath/],
    [{ deployment: { target: 'github-pages', routing: 'browser' } }, /deployment.routing/],
    [{ editor: { enabled: 'false' } }, /editor.enabled/], [{ editor: { persistence: 'remote' } }, /editor.persistence/],
    [{ features: { character: false } }, /features.character/], [{ features: { animations: 0 } }, /features.animations/],
  ]
  for (const [input, error] of cases) assert.throws(() => validateSiteConfig(input), error, JSON.stringify(input))
})

test('repo-derived identity is stable across profiles and independent between repositories', () => {
  const a = { repository: { owner: 'Owner', name: 'Project-A' } }
  const b = { repository: { owner: 'owner', name: 'project-b' } }
  for (const mode of ['production', 'docker', 'github-pages']) {
    assert.equal(resolveSiteConfig(a, mode).siteId, 'github:owner/project-a')
    assert.equal(resolveSiteConfig(b, mode).siteId, 'github:owner/project-b')
  }
  assert.equal(resolveSiteConfig(a, 'github-pages').deployment.basePath, '/Project-A/')
  assert.equal(resolveSiteConfig({}, 'github-pages', { GITHUB_REPOSITORY: 'Owner/OWNER.github.io' }).deployment.basePath, '/')
  assert.equal(resolveSiteConfig({ ...a, siteId: 'custom-site' }, 'docker').siteId, 'custom-site')
  assert.equal(resolveSiteConfig({}, 'production', { GITHUB_REPOSITORY: 'owner/project' }).siteId, 'github:owner/project')
  assert.throws(() => resolveSiteConfig(a, 'github-pages', { GITHUB_REPOSITORY: 'owner/other' }), /conflicts/)
  assert.equal(resolveSiteConfig(a, 'github-pages', { GITHUB_REPOSITORY: 'owner/project-a' }).siteId, 'github:owner/project-a')
})

test('Pages with a manual path and no repository requires an explicit stable identity', () => {
  assert.throws(() => resolveSiteConfig({}, 'github-pages', { WEBBLOCKS_BASE_PATH: '/' }), /siteId/)
  const result = resolveSiteConfig({ siteId: 'custom.example' }, 'github-pages', { WEBBLOCKS_BASE_PATH: '' })
  assert.equal(result.siteId, 'custom.example')
  assert.equal(result.deployment.basePath, '/')
  assert.equal(result.repository, null)
})

test('deployment defaults, named modes, env overrides and routing stay coherent', () => {
  const input = { repository: { owner: 'owner', name: 'project' }, deployment: { target: 'github-pages', basePath: '/docs', routing: 'hash' } }
  assert.deepEqual(resolveSiteConfig(input, 'production').deployment, { profile: 'github-pages', basePath: '/docs/', source: 'explicit', routing: 'hash' })
  assert.deepEqual(resolveSiteConfig(input, 'docker').deployment, { profile: 'docker', basePath: '/', source: 'default', routing: 'browser' })
  assert.equal(resolveSiteConfig(input, 'development', { WEBBLOCKS_DEPLOYMENT: 'local' }).deployment.basePath, '/')
  assert.equal(resolveSiteConfig(input, 'github-pages', { WEBBLOCKS_BASE_PATH: '' }).deployment.basePath, '/')
  assert.equal(resolveSiteConfig(input, 'github-pages', { WEBBLOCKS_BASE_PATH: 'auto' }).deployment.basePath, '/project/')
  assert.throws(() => resolveSiteConfig(input, 'docker', { WEBBLOCKS_DEPLOYMENT: 'github-pages' }), /conflicts/)
})

test('metadata escaping prevents HTML injection and replacement-string substitution', () => {
  const site = validateSiteConfig({ site: { title: '$& <script>alert(1)</script>', description: '" onload="evil & <tag> \'', language: 'de-de' } }).site
  const result = renderSiteMetadata(read('index.html'), site)
  assert.match(result, /<html lang="de-DE">/)
  assert.match(result, /<title>\$&amp; &lt;script&gt;alert\(1\)&lt;\/script&gt;<\/title>/)
  assert.match(result, /content="&quot; onload=&quot;evil &amp; &lt;tag&gt; &#39;"/)
  assert.doesNotMatch(result, /<script>alert|<tag>/)
  assert.equal([...result.matchAll(/<title>/g)].length, 1)
})

test('configuration is wired into build metadata, editor, characters and background motion', () => {
  assert.match(read('vite.config.ts'), /__WEBBLOCKS_SITE__: JSON.stringify\(site\)/)
  assert.match(read('vite.config.ts'), /transformIndexHtml: \(html: string\) => renderSiteMetadata\(html, site.site\)/)
  assert.match(read('src/config/site.ts'), /typeof __WEBBLOCKS_SITE__ === 'undefined'/)
  assert.match(read('src/App.tsx'), /siteConfig.features.effects && <FallingSquares/)
  assert.match(read('src/App.tsx'), /enableParallax=\{siteConfig.features.animations\}/)
  assert.match(read('src/components/Effects/squares/fallingsquares.scss'), /falling-squares--static[^{]*\{\s*animation-play-state: paused/)
  assert.match(read('src/tablets/Homepage.tsx'), /siteConfig.editor.enabled && <span className='editorPanel'/)
  assert.match(read('src/components/Characters/CharacterUtil.tsx'), /if \(!siteConfig.features.characters\) return \[\]/)
  assert.match(read('src/components/ControlPanel/SettingsControlPanel/SettingsControlPanel.tsx'), /siteConfig.features.characters && <span className='characterRosterPanel'/)
  assert.match(read('src/components/ControlPanel/ControlPanelControls/ControlPanelControls.tsx'), /siteConfig.features.animations && <AnimController/)
})
