import type { AnimationState } from './slices/presets/AnimationPreset'
import type { DurableState } from './persistence.mjs'
export type EditorConfigData = Pick<DurableState, 'characterTracker' | 'settingsFields'> & {
  menuFields: Omit<DurableState['menuFields'], 'presistCharacters'>
}
export type EditorConfig = { format: 'webblocks-editor-config'; schemaVersion: 1; siteId: string; data: EditorConfigData }
export const EDITOR_CONFIG_FORMAT: 'webblocks-editor-config'
export const EDITOR_CONFIG_VERSION: 1
export const MAX_EDITOR_CONFIG_BYTES: number
export function projectEditorConfig(animation: unknown): EditorConfigData
export function encodeEditorConfig(animation: unknown, siteId: string): string
export function decodeEditorConfig(raw: string, expectedSiteId: string): EditorConfig
export function applyEditorConfig<T extends AnimationState>(animation: T, data: EditorConfigData): T
