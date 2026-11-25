import { snapshot } from './persistence.mjs'

export const EDITOR_CONFIG_FORMAT = 'webblocks-editor-config'
export const EDITOR_CONFIG_VERSION = 1
export const MAX_EDITOR_CONFIG_BYTES = 1024 * 1024
const validSiteId = value => typeof value === 'string' && /^[a-z0-9][a-z0-9._:/-]{0,159}$/.test(value) && !/[^a-z0-9._:/-]/.test(value) && value !== 'auto'
const invalid = () => { throw new Error('Invalid editor configuration data.') }
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value)

// Project only committed, portable settings. Local opt-out, panel visibility,
// selected page and unsaved drafts are not part of a published website preset.
export function projectEditorConfig(animation) {
  const data = snapshot(animation)
  const { targetFPS, showFPS, runLength, nonStop } = data.menuFields
  return {
    characterTracker: data.characterTracker.map(entry => ({
      page: entry.page,
      chars: entry.chars.map(char => {
        const portable = { ...char }
        delete portable.updated
        delete portable.preCalculated
        return portable
      }),
    })),
    menuFields: { targetFPS, showFPS, runLength, nonStop },
    settingsFields: data.settingsFields,
  }
}

function assertSameData(input, normalized) {
  if (input === normalized) return
  if (Array.isArray(normalized)) {
    if (!Array.isArray(input) || input.length !== normalized.length) invalid()
    normalized.forEach((value, index) => assertSameData(input[index], value))
  } else if (isRecord(normalized)) {
    if (!isRecord(input) || Object.keys(input).length !== Object.keys(normalized).length) invalid()
    for (const key of Object.keys(normalized)) {
      if (!Object.hasOwn(input, key)) invalid()
      assertSameData(input[key], normalized[key])
    }
  } else invalid()
}

function validateData(input) {
  if (!isRecord(input) || !isRecord(input.menuFields)) invalid()
  let data
  try {
    data = projectEditorConfig({
      openControlPanel: false, openSettingsPanel: false, openControllerPanel: false,
      settingsCurrentArea: 0, rosterPage: 1,
      characterTracker: input.characterTracker,
      menuFields: { ...input.menuFields, presistCharacters: true },
      settingsFields: input.settingsFields,
    })
  } catch { invalid() }
  // Unlike the backwards-compatible storage decoder, interchange rejects unknown
  // fields and lossy normalization, including injected runtime/prototype keys.
  assertSameData(input, data)
  return data
}

export function encodeEditorConfig(animation, siteId) {
  if (!validSiteId(siteId)) throw new Error('Invalid editor configuration site identity.')
  const data = projectEditorConfig(animation)
  const raw = JSON.stringify({ format: EDITOR_CONFIG_FORMAT, schemaVersion: EDITOR_CONFIG_VERSION, siteId, data }, null, 2) + '\n'
  // Use the same acceptance rules for downloads and build-time defaults.
  decodeEditorConfig(raw, siteId)
  return raw
}

export function decodeEditorConfig(raw, expectedSiteId) {
  if (typeof raw !== 'string' || raw.length > MAX_EDITOR_CONFIG_BYTES || new TextEncoder().encode(raw).byteLength > MAX_EDITOR_CONFIG_BYTES) {
    throw new Error('Editor configuration exceeds the 1 MiB file limit.')
  }
  let value
  try { value = JSON.parse(raw) } catch { throw new Error('Editor configuration is not valid JSON.') }
  if (!isRecord(value) || value.format !== EDITOR_CONFIG_FORMAT || value.schemaVersion !== EDITOR_CONFIG_VERSION) {
    throw new Error('Unsupported Webblocks editor configuration format or version.')
  }
  if (!validSiteId(value.siteId) || !validSiteId(expectedSiteId)) throw new Error('Invalid editor configuration site identity.')
  if (value.siteId !== expectedSiteId) throw new Error(`Configuration belongs to ${value.siteId}, not ${expectedSiteId}.`)
  if (Object.keys(value).length !== 4 || !Object.hasOwn(value, 'data')) invalid()
  return { format: EDITOR_CONFIG_FORMAT, schemaVersion: EDITOR_CONFIG_VERSION, siteId: value.siteId, data: validateData(value.data) }
}

// Merge onto the current site's state without importing local preferences.
export function applyEditorConfig(animation, data) {
  return {
    ...animation,
    characterTracker: data.characterTracker,
    menuFields: { ...animation.menuFields, ...data.menuFields },
    settingsFields: data.settingsFields,
  }
}
