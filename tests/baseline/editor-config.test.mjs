import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { applyEditorConfig, decodeEditorConfig, encodeEditorConfig, MAX_EDITOR_CONFIG_BYTES, projectEditorConfig } from '../../src/state-management/editor-config.mjs'
import { loadEditorDefaults } from '../../config/editor-defaults.mjs'
import { createPersistence, snapshot } from '../../src/state-management/persistence.mjs'

const site = 'github:owner/a'
function fixture() {
  return {
    openControlPanel: true, openSettingsPanel: true, openControllerPanel: false,
    settingsCurrentArea: 2, rosterPage: 4, currentPage: 6, playback: 3,
    menuFields: { presistCharacters: false, targetFPS: 42, showFPS: true, runLength: 20, nonStop: false },
    settingsFields: { juggleAnimationBounding: true },
    characterTracker: Array.from({ length: 8 }, (_, i) => ({ page: i + 1, chars: i === 0 ? [{
      identifier: 'character-a', type: 2, subType: 0, attributes: [1], orientation: 1,
      currentX: 5, currentY: 10, sizes: { width: 48, height: 48 }, movement: { directionOne: 0, boundingBox: null },
      speaking: 'Hello 世界', speakingStats: { height: 50, width: undefined, useWordWrap: true },
      updated: true, preCalculated: false, active: true, toRender: true,
    }] : [] })),
    charSheetFields: { character: { identifier: 'draft' } },
  }
}
const document = () => JSON.parse(encodeEditorConfig(fixture(), site))

test('portable export round-trips committed characters, Unicode and settings', () => {
  const state = fixture()
  state.identifier = {}; state.identifier.self = state.identifier
  const raw = encodeEditorConfig(state, site)
  const decoded = decodeEditorConfig(raw, site)
  assert.deepEqual(decoded, { format: 'webblocks-editor-config', schemaVersion: 1, siteId: site, data: projectEditorConfig(state) })
  assert.equal(decoded.data.characterTracker[0].chars[0].speaking, 'Hello 世界')
  assert.equal(decoded.data.characterTracker[0].chars[0].movement.boundingBox, null)
  assert.equal(decoded.data.characterTracker[0].chars[0].active, true)
  assert.deepEqual(decoded.data.menuFields, { targetFPS: 42, showFPS: true, runLength: 20, nonStop: false })
  assert.ok(raw.endsWith('\n'))
  assert.equal(encodeEditorConfig(applyEditorConfig(state, decoded.data), site), raw)
})

test('portable files exclude local preferences and runtime/draft fields', () => {
  const { data } = document()
  for (const key of ['openControlPanel', 'openSettingsPanel', 'openControllerPanel', 'settingsCurrentArea', 'rosterPage', 'currentPage', 'playback', 'identifier', 'charSheetFields']) assert.equal(Object.hasOwn(data, key), false)
  assert.equal(Object.hasOwn(data.menuFields, 'presistCharacters'), false)
  for (const key of ['updated', 'preCalculated']) assert.equal(Object.hasOwn(data.characterTracker[0].chars[0], key), false)
})

test('import projection preserves current site opt-out, navigation and panel state', () => {
  const original = fixture()
  const changed = { ...original, menuFields: { ...original.menuFields, targetFPS: 60, presistCharacters: true }, openControlPanel: false, rosterPage: 8 }
  const merged = applyEditorConfig(changed, document().data)
  assert.equal(merged.menuFields.targetFPS, 42)
  assert.equal(merged.menuFields.presistCharacters, true)
  assert.equal(merged.openControlPanel, false)
  assert.equal(merged.rosterPage, 8)
  assert.equal(changed.menuFields.targetFPS, 60)
  assert.equal(applyEditorConfig(original, document().data).menuFields.presistCharacters, false)
  assert.doesNotThrow(() => snapshot(merged))
})

test('reject mismatched or invalid site identities and unsupported interchange versions', () => {
  const value = document()
  assert.throws(() => decodeEditorConfig(JSON.stringify(value), 'github:owner/b'), /belongs to/)
  for (const change of [{ schemaVersion: 2 }, { format: 'persist:root' }, { siteId: 'AUTO' }, { siteId: 'auto' }, { siteId: 'a\n' }]) {
    assert.throws(() => decodeEditorConfig(JSON.stringify({ ...value, ...change }), site))
  }
  assert.throws(() => encodeEditorConfig(fixture(), 'auto'), /identity/)
  assert.throws(() => decodeEditorConfig('{bad', site), /not valid JSON/)
  assert.throws(() => decodeEditorConfig('null', site), /Unsupported/)
})

test('reject invalid or lossy payloads before any changes can be applied', () => {
  for (const change of [
    value => { value.extra = true },
    value => { value.data.menuFields.presistCharacters = true },
    value => { value.data.characterTracker.pop() },
    value => { value.data.characterTracker[1].page = 1 },
    value => { value.data.characterTracker[0].chars.push(value.data.characterTracker[0].chars[0]) },
    value => { value.data.characterTracker[0].chars[0].type = 99 },
    value => { value.data.characterTracker[0].chars[0].currentX = 'left' },
    value => { value.data.characterTracker[0].chars[0].sizes.width = null },
    value => { value.data.characterTracker[0].chars[0].updated = false },
    value => { value.data.settingsFields = null },
    value => { delete value.data.menuFields.targetFPS },
    value => { value.data.charSheetFields = {} },
    value => { Object.defineProperty(value.data, '__proto__', { enumerable: true, value: { polluted: true } }) },
  ]) {
    const value = document(); change(value)
    assert.throws(() => decodeEditorConfig(JSON.stringify(value), site), undefined, JSON.stringify(value))
  }
  assert.equal({}.polluted, undefined)
  const state = fixture(); state.characterTracker.pop()
  assert.throws(() => encodeEditorConfig(state, site))
})

test('enforce byte-size limit on both upload and download, including multibyte text', () => {
  assert.throws(() => decodeEditorConfig(' '.repeat(MAX_EDITOR_CONFIG_BYTES + 1), site), /1 MiB/)
  assert.throws(() => decodeEditorConfig('界'.repeat(Math.floor(MAX_EDITOR_CONFIG_BYTES / 2)), site), /1 MiB/)
  const state = fixture(); state.characterTracker[0].chars[0].speaking = '界'.repeat(MAX_EDITOR_CONFIG_BYTES)
  assert.throws(() => encodeEditorConfig(state, site), /1 MiB/)
})

test('build defaults load beside selected config and reject invalid or foreign files', t => {
  const dir = mkdtempSync(join(tmpdir(), 'wgp07-defaults-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const configPath = join(dir, 'site.json')
  const defaultsPath = join(dir, 'webblocks.defaults.json')
  assert.equal(loadEditorDefaults(configPath, site), null)
  writeFileSync(defaultsPath, encodeEditorConfig(fixture(), site))
  assert.deepEqual(loadEditorDefaults(configPath, site), document().data)
  assert.throws(() => loadEditorDefaults(configPath, 'other-site'), /belongs to/)
  mkdirSync(join(dir, 'other'))
  assert.equal(loadEditorDefaults(join(dir, 'other', 'site.json'), site), null)
  writeFileSync(defaultsPath, '{bad')
  assert.throws(() => loadEditorDefaults(configPath, site), /not valid JSON/)
  writeFileSync(defaultsPath, ' '.repeat(MAX_EDITOR_CONFIG_BYTES + 1))
  assert.throws(() => loadEditorDefaults(configPath, site), /1 MiB/)
  rmSync(defaultsPath); mkdirSync(defaultsPath)
  assert.throws(() => loadEditorDefaults(configPath, site), /Expected a JSON file/)
})

test('interchange does not mutate storage; a saved import uses only the current site key', () => {
  const map = new Map()
  const storage = { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) }
  const a = createPersistence(storage, site), b = createPersistence(storage, 'github:owner/b')
  const original = { ...fixture(), menuFields: { ...fixture().menuFields, presistCharacters: true } }
  b.save(original)
  const savedB = storage.getItem(b.key)
  storage.setItem(a.key, '{corrupt'); a.load()
  const raw = encodeEditorConfig(original, site)
  assert.equal(storage.getItem(a.key), '{corrupt')
  assert.throws(() => decodeEditorConfig(raw, 'github:owner/b'))
  assert.equal(a.save(applyEditorConfig(original, decodeEditorConfig(raw, site).data), true), null)
  assert.equal(a.load().data.menuFields.targetFPS, 42)
  assert.equal(storage.getItem(b.key), savedB)
})

test('production wiring uses validated defaults and the file controls', () => {
  const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8')
  assert.match(read('vite.config.ts'), /loadEditorDefaults\(configPath, site.siteId\)/)
  assert.match(read('vite.config.ts'), /__WEBBLOCKS_EDITOR_DEFAULTS__: JSON.stringify\(editorDefaults\)/)
  assert.match(read('src/state-management/store.ts'), /decodeEditorConfig\(action.payload, siteId\)/)
  assert.match(read('src/state-management/store.ts'), /next\(clearSavedCharacterSheet\(defaults \?\? undefined\)\)/)
  assert.match(read('src/state-management/store.ts'), /next\(resetCharacterSheet\(defaults\?\.characterTracker\)\)/)
  assert.match(read('src/components/ControlPanel/SettingsControlPanel/EditorConfigurationControls.tsx'), /window.confirm/)
  assert.match(read('src/components/ControlPanel/SettingsControlPanel/SettingsControlPanel.tsx'), /<EditorConfigurationControls \/>/)
})
