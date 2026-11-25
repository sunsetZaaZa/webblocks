// The only durable state contract. No timers, runtime metadata, route state or
// unsaved Character Sheet selection are restored from a previous session.
export const LEGACY_KEY = 'persist:root'
export const STORAGE_VERSION = 1
export const storageKey = siteId => `persist:webblocks:${siteId}:v${STORAGE_VERSION}`
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const bool = value => typeof value === 'boolean'
const number = value => typeof value === 'number' && Number.isFinite(value)
const text = value => typeof value === 'string'
const integer = (min, max) => value => Number.isInteger(value) && value >= min && value <= max
const page = integer(1, 8)
const MAX_STORAGE_BYTES = 2 * 1024 * 1024
const withinStorageLimit = raw => typeof raw === "string" && raw.length <= MAX_STORAGE_BYTES && new TextEncoder().encode(raw).byteLength <= MAX_STORAGE_BYTES
const fail = () => { throw new Error('Invalid saved editor data') }
const optional = (value, schema) => {
  if (!record(value)) fail()
  const output = {}
  for (const [key, valid] of Object.entries(schema)) {
    const item = value[key]
    // Optional numeric inputs can be NaN in the live editor; JSON encodes that
    // as null. Treat missing/empty optional inputs as absent, not as zero.
    if (item === undefined || item === null || (valid === number && typeof item === 'number' && !Number.isFinite(item))) continue
    if (!valid(item)) fail()
    output[key] = item
  }
  return output
}
const fields = (keys, validator) => Object.fromEntries(keys.split(' ').map(key => [key, validator]))
const movementSchema = {
  ...fields('xInterval yInterval rotateDegree xRate yRate', number),
  directionOne: integer(0, 4), directionTwo: integer(0, 4),
}
const boundingSchema = { ...fields('xBound yBound xOrigin yOrigin', number), shape: integer(2, 6) }
const speakingSchema = { ...fields('width height marginRight marginLeft marginTop marginBottom rotation zIndex wordWrapLength', number), useWordWrap: bool }
const characterSchema = {
  ...fields('prefix identifier attachedTo speaking credits', text),
  ...fields('index currentX currentY rotation delay zIndex', number),
  ...fields('preCalculated updated active toRender', bool),
  type: integer(0, 2), subType: integer(0, 0), orientation: integer(0, 2), matchingGroup: integer(0, 1),
  attributes: value => Array.isArray(value) && value.every(integer(0, 1)),
}
function character(value) {
  const result = optional(value, characterSchema)
  if (!result.identifier || result.type === undefined) fail()
  if (value.movement != null) {
    result.movement = optional(value.movement, movementSchema)
    if (value.movement.boundingBox != null) result.movement.boundingBox = optional(value.movement.boundingBox, boundingSchema)
    else if (value.movement.boundingBox === null) result.movement.boundingBox = null
  } else if (value.movement === null) result.movement = null
  if (value.sizes != null) result.sizes = optional(value.sizes, fields('height width', number))
  if (value.speakingStats != null) result.speakingStats = optional(value.speakingStats, speakingSchema)
  if (value.switches != null) result.switches = optional(value.switches, fields('outputSpeaking useHighlighter uprightHighlighter', bool))
  return result
}
function roster(value) {
  if (!Array.isArray(value) || value.length !== 8) fail()
  const pages = new Set()
  return value.map(entry => {
    if (!record(entry) || !page(entry.page) || pages.has(entry.page) || !Array.isArray(entry.chars)) fail()
    pages.add(entry.page)
    const chars = entry.chars.map(character)
    if (new Set(chars.map(item => item.identifier)).size !== chars.length) fail()
    return { page: entry.page, chars }
  })
}
const menuSchema = { presistCharacters: bool, targetFPS: number, showFPS: bool, runLength: number, nonStop: bool }
const editorSchema = { openControlPanel: bool, openSettingsPanel: bool, openControllerPanel: bool, settingsCurrentArea: integer(0, 2), rosterPage: page }
const settingsSchema = { juggleAnimationBounding: bool }
function required(value, schema) {
  const result = optional(value, schema)
  if (Object.keys(result).length !== Object.keys(schema).length) fail()
  return result
}
export function snapshot(animation) {
  return {
    ...required(animation, editorSchema),
    menuFields: required(animation.menuFields, menuSchema),
    settingsFields: required(animation.settingsFields, settingsSchema),
    characterTracker: roster(animation.characterTracker),
  }
}
export function durableChanged(before, after) {
  return [...Object.keys(editorSchema), 'menuFields', 'settingsFields', 'characterTracker'].some(key => before[key] !== after[key])
}
export function decode(raw, siteId) {
  if (!withinStorageLimit(raw)) fail()
  const value = JSON.parse(raw)
  if (!record(value) || value.version !== STORAGE_VERSION || value.siteId !== siteId || !bool(value.enabled)) fail()
  if (!value.enabled) return { enabled: false }
  const data = snapshot(value.data)
  if (!data.menuFields.presistCharacters) fail()
  return { enabled: true, data }
}
export function decodeLegacy(raw) {
  if (!withinStorageLimit(raw)) fail()
  const value = JSON.parse(raw)
  if (!record(value) || !text(value.animation)) fail()
  const animation = JSON.parse(value.animation)
  // The legacy seven-page preset omitted the unused consulting roster.
  // Only the legacy decoder accepts that exact omission, not a broken v1 record.
  if (record(animation) && Array.isArray(animation.characterTracker) && animation.characterTracker.length === 7 &&
      !animation.characterTracker.some(entry => entry?.page === 4)) {
    animation.characterTracker = [...animation.characterTracker, { page: 4, chars: [] }]
  }
  const data = snapshot(animation)
  if (!data.menuFields.presistCharacters) fail()
  return data
}

// Synchronous browser-local operations avoid delayed writes after opt-out or
// purge. Storage errors are surfaced, not allowed to crash the application.
export function createPersistence(storage, siteId) {
  const key = storageKey(siteId)
  let protectedRecord = false
  const unavailable = 'Browser storage is unavailable. Changes may not survive refresh.'
  return {
    key,
    load() {
      let raw
      try { raw = storage.getItem(key) } catch { return { warning: unavailable } }
      if (raw === null) return {}
      try { return decode(raw, siteId) } catch {
        protectedRecord = true
        return { warning: 'Saved data is invalid or uses an unsupported version. Defaults loaded; clear or import to replace it.' }
      }
    },
    legacy() {
      try {
        const raw = storage.getItem(LEGACY_KEY)
        return raw === null ? undefined : decodeLegacy(raw)
      } catch { return undefined }
    },
    save(animation, replace = false) {
      const enabled = animation.menuFields.presistCharacters
      if (protectedRecord && enabled && !replace) return 'Saved data is protected. Clear or import to replace it.'
      try {
        // Serialize only the durable projection; runtime objects may be circular.
        const value = { version: STORAGE_VERSION, siteId, enabled }
        if (enabled) value.data = snapshot(animation)
        const raw = JSON.stringify(value)
        if (!withinStorageLimit(raw)) fail()
        storage.setItem(key, raw)
        protectedRecord = false
        return null
      } catch { return 'Could not save editor data. Check browser storage or clear invalid editor data.' }
    },
    clear(enabled) {
      try {
        // Retain an opt-out marker across reloads, but no character data.
        if (enabled) storage.removeItem(key)
        else storage.setItem(key, JSON.stringify({ version: STORAGE_VERSION, siteId, enabled: false }))
        protectedRecord = false
        return null
      } catch { return 'Could not clear saved editor data. Check browser storage.' }
    },
  }
}
