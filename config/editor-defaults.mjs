import { readFileSync, lstatSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { decodeEditorConfig, MAX_EDITOR_CONFIG_BYTES } from '../src/state-management/editor-config.mjs'

// Defaults live beside the selected repository config, never in public/.
export function loadEditorDefaults(configPath, siteId) {
  const path = resolve(dirname(configPath), 'webblocks.defaults.json')
  try {
    const info = lstatSync(path)
    if (!info.isFile() || info.size > MAX_EDITOR_CONFIG_BYTES) throw new Error('Expected a JSON file of at most 1 MiB.')
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw new Error(`Cannot load Webblocks defaults ${path}: ${error.message}`)
  }
  try { return decodeEditorConfig(readFileSync(path, 'utf8'), siteId).data }
  catch (error) { throw new Error(`Cannot load Webblocks defaults ${path}: ${error.message}`) }
}
