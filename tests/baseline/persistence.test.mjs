import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { createPersistence, decode, decodeLegacy, durableChanged, LEGACY_KEY, snapshot, storageKey } from '../../src/state-management/persistence.mjs'

function memoryStorage() {
  const values = new Map()
  return {
    values,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  }
}
function fixture(name = 'character-a') {
  return {
    openControlPanel: true, openSettingsPanel: true, openControllerPanel: false,
    settingsCurrentArea: 0, rosterPage: 1,
    menuFields: { presistCharacters: true, targetFPS: 23, showFPS: false, runLength: 10, nonStop: false },
    settingsFields: { juggleAnimationBounding: false },
    characterTracker: Array.from({ length: 8 }, (_, i) => ({ page: i + 1, chars: i ? [] : [{
      identifier: name, type: 2, subType: 0, attributes: [1], orientation: 1, currentX: 50, currentY: 100,
      sizes: { width: 100, height: 52 }, movement: { xInterval: 10, directionOne: 3, boundingBox: { shape: 3, xBound: 20 } },
      speaking: 'hello', speakingStats: { useWordWrap: true, wordWrapLength: 80 }, switches: { outputSpeaking: true },
    }] })),
    currentPage: 3, playback: 2, charSheetFields: { character: { identifier: 'draft' } },
  }
}
const legacy = value => JSON.stringify({ animation: JSON.stringify(value), _persist: '{"version":-1,"rehydrated":true}' })

test('site IDs produce independent, versioned keys on a shared storage origin', () => {
  const storage = memoryStorage()
  const a = createPersistence(storage, 'github:owner/a')
  const b = createPersistence(storage, 'github:owner/b')
  assert.equal(a.key, 'persist:webblocks:github:owner/a:v1')
  assert.notEqual(a.key, b.key)
  assert.equal(a.save(fixture('A')), null)
  assert.deepEqual(b.load(), {})
  assert.equal(b.save(fixture('B')), null)
  assert.equal(a.load().data.characterTracker[0].chars[0].identifier, 'A')
  assert.equal(b.load().data.characterTracker[0].chars[0].identifier, 'B')
  assert.equal(a.clear(true), null)
  assert.equal(storage.getItem(a.key), null)
  assert.equal(b.load().data.characterTracker[0].chars[0].identifier, 'B')
})

test('opt-out removes durable data and survives reload; re-enable saves current state', () => {
  const storage = memoryStorage()
  const a = createPersistence(storage, 'a')
  const state = fixture()
  assert.equal(a.save(state), null)
  state.menuFields.presistCharacters = false
  assert.equal(a.save(state), null)
  assert.deepEqual(JSON.parse(storage.getItem(a.key)), { version: 1, siteId: 'a', enabled: false })
  assert.deepEqual(createPersistence(storage, 'a').load(), { enabled: false })
  assert.equal(a.clear(false), null)
  assert.deepEqual(createPersistence(storage, 'a').load(), { enabled: false })
  state.menuFields.presistCharacters = true
  assert.equal(a.save(state), null)
  assert.deepEqual(createPersistence(storage, 'a').load().data, snapshot(state))
})

test('legacy storage is never automatically claimed, altered or removed', () => {
  const storage = memoryStorage()
  const raw = legacy(fixture('legacy'))
  storage.setItem(LEGACY_KEY, raw)
  const a = createPersistence(storage, 'a')
  const b = createPersistence(storage, 'b')
  assert.deepEqual(a.load(), {})
  assert.deepEqual(b.load(), {})
  const imported = a.legacy()
  assert.deepEqual(imported, snapshot(fixture('legacy')))
  assert.equal(a.save(imported, true), null)
  assert.deepEqual(b.load(), {})
  a.clear(true)
  assert.equal(storage.getItem(LEGACY_KEY), raw)
  assert.throws(() => decodeLegacy(legacy({ ...fixture(), menuFields: { ...fixture().menuFields, presistCharacters: false } })))
  storage.setItem(LEGACY_KEY, '{invalid')
  assert.equal(a.legacy(), undefined)
})

test('legacy seven-page preset repairs only the historically absent consulting roster', () => {
  const state = fixture()
  state.characterTracker = state.characterTracker.filter(entry => entry.page !== 4)
  const data = decodeLegacy(legacy(state))
  assert.equal(data.characterTracker.length, 8)
  assert.deepEqual(data.characterTracker.find(entry => entry.page === 4), { page: 4, chars: [] })
  assert.throws(() => snapshot(state))
  state.characterTracker = fixture().characterTracker.filter(entry => entry.page !== 3)
  assert.throws(() => decodeLegacy(legacy(state)))
})

test('durable projection excludes runtime timers, navigation, selection and unsaved draft', () => {
  const state = fixture()
  state.identifier = { circular: null }; state.identifier.circular = state.identifier
  state.characterTracker[0].chars[0].speakingStats.width = NaN
  const storage = memoryStorage()
  const a = createPersistence(storage, 'a')
  assert.equal(a.save(state), null)
  const saved = JSON.parse(storage.getItem(a.key)).data
  for (const key of ['identifier', 'currentPage', 'playback', 'charSheetFields', 'characterEditor', 'runtimeMetadata']) assert.equal(Object.hasOwn(saved, key), false)
  assert.equal(Object.hasOwn(saved.characterTracker[0].chars[0].speakingStats, 'width'), false)
  assert.deepEqual(a.load().data, snapshot(state))
  assert.equal(durableChanged(state, { ...state, playback: 3, currentPage: 1 }), false)
  assert.equal(durableChanged(state, { ...state, menuFields: { ...state.menuFields, targetFPS: 30 } }), true)
})

test('malformed or unsupported data loads defaults and stays protected until explicit replacement', () => {
  const storage = memoryStorage()
  for (const raw of ['{bad', '{"version":2,"siteId":"a","enabled":true}', '{"version":1,"siteId":"b","enabled":false}', '{"version":1,"siteId":"a","enabled":true,"data":null}']) {
    storage.setItem(storageKey('a'), raw)
    const a = createPersistence(storage, 'a')
    assert.match(a.load().warning, /invalid|unsupported/)
    assert.match(a.save(fixture()), /protected/)
    assert.equal(storage.getItem(a.key), raw)
    assert.equal(a.clear(true), null)
    assert.equal(a.save(fixture()), null)
    assert.equal(a.load().enabled, true)
  }
})

test('reject missing pages, duplicated pages or identifiers and malformed nested character data', () => {
  const mutations = [
    s => s.characterTracker.pop(),
    s => { s.characterTracker[1].page = 1 },
    s => s.characterTracker[0].chars.push(s.characterTracker[0].chars[0]),
    s => { s.characterTracker[0].chars[0].type = 99 },
    s => { s.characterTracker[0].chars[0].movement.boundingBox = 'bad' },
    s => { s.characterTracker[0].chars[0].attributes = [null] },
    s => { s.menuFields.targetFPS = 'fast' },
    s => { s.settingsFields = null },
  ]
  for (const mutate of mutations) {
    const state = fixture(); mutate(state)
    assert.throws(() => snapshot(state))
    assert.throws(() => decode(JSON.stringify({ version: 1, siteId: 'a', enabled: true, data: state }), 'a'))
  }
})

test('unknown fields are discarded, including dangerous JSON keys', () => {
  const state = fixture()
  const injected = JSON.parse('{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},"unknown":true}')
  Object.assign(state.characterTracker[0].chars[0], { unknown: true })
  Object.defineProperty(state.characterTracker[0].chars[0], '__proto__', { value: injected, enumerable: true })
  const data = snapshot(state)
  assert.equal(Object.hasOwn(data.characterTracker[0].chars[0], '__proto__'), false)
  assert.equal(Object.hasOwn(data.characterTracker[0].chars[0], 'unknown'), false)
  assert.equal({}.polluted, undefined)
})

test('blocked browser storage, quota errors and failed purge are nonfatal', () => {
  const denied = () => { throw new Error('denied') }
  const a = createPersistence({ getItem: denied, setItem: denied, removeItem: denied }, 'a')
  assert.match(a.load().warning, /unavailable/)
  assert.equal(a.legacy(), undefined)
  assert.match(a.save(fixture()), /Could not save/)
  assert.match(a.clear(true), /Could not clear/)
  assert.match(a.clear(false), /Could not clear/)
})

test('production store and UI use scoped operations instead of legacy persistor packages', () => {
  const read = p => readFileSync(new URL('../../' + p, import.meta.url), 'utf8')
  const pkg = JSON.parse(read('package.json'))
  for (const dependency of ['redux-persist', 'reduxjs-toolkit-persist']) {
    assert.equal(Object.hasOwn(pkg.dependencies, dependency), false)
    assert.ok(!read('bun.lock').includes('"' + dependency + '"'))
  }
  assert.match(read('src/state-management/store.ts'), /createSiteStore\(siteConfig\.siteId, browserStorage, editorDefaults\)/)
  assert.match(read('src/state-management/store.ts'), /clearSavedCharacterSheet\.match\(action\)/)
  assert.match(read('src/components/ControlPanel/SettingsControlPanel/SettingsControlPanel.tsx'), /dispatch\(togglePersist\(event\.target\.checked\)\)/)
  assert.doesNotMatch(read('src/main.tsx'), /PersistGate/)
})
