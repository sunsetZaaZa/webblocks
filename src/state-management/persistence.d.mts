import type { AnimationState } from './slices/presets/AnimationPreset'
export type DurableState = Pick<AnimationState, 'openControlPanel' | 'openSettingsPanel' | 'openControllerPanel' | 'settingsCurrentArea' | 'rosterPage' | 'menuFields' | 'settingsFields' | 'characterTracker'>
export interface LocalStoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export const LEGACY_KEY: string
export const STORAGE_VERSION: 1
export function storageKey(siteId: string): string
export function snapshot(animation: unknown): DurableState
export function durableChanged(before: AnimationState, after: AnimationState): boolean
export function decode(raw: string, siteId: string): { enabled: boolean; data?: DurableState }
export function decodeLegacy(raw: string): DurableState
export function createPersistence(storage: LocalStoragePort, siteId: string): {
  key: string
  load(): { enabled?: boolean; data?: DurableState; warning?: string }
  legacy(): DurableState | undefined
  save(animation: AnimationState, replace?: boolean): string | null
  clear(enabled: boolean): string | null
}
