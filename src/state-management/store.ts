import { configureStore, type Middleware } from '@reduxjs/toolkit'
import { editorDefaults, siteConfig } from '../config/site'
import AnimationSlice, { clearSavedCharacterSheet, importEditorConfiguration, importLegacyCharacterSheet, resetCharacterSheet, restoreSavedEditor, setPersistenceNotice, togglePersist } from './slices/AnimationSlice'
import { initialState, type AnimationState } from './slices/presets/AnimationPreset'
import { createPersistence, durableChanged, snapshot, type LocalStoragePort } from './persistence.mjs'

import { applyEditorConfig, decodeEditorConfig, type EditorConfigData } from './editor-config.mjs'

// Access the getter inside each guarded storage operation: some browsers throw
// SecurityError even when reading window.localStorage itself.
const browserStorage: LocalStoragePort = {
  getItem: key => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
  removeItem: key => window.localStorage.removeItem(key),
}

export function createSiteStore(siteId: string, storage: LocalStoragePort, defaults: EditorConfigData | null = null) {
  const persistence = createPersistence(storage, siteId)
  const loaded = persistence.load()
  const baseline = defaults ? applyEditorConfig(initialState, defaults) : initialState
  const animation: AnimationState = {
    ...baseline,
    ...loaded.data,
    menuFields: { ...(loaded.data?.menuFields ?? baseline.menuFields), presistCharacters: loaded.enabled ?? initialState.menuFields.presistCharacters },
    persistenceNotice: loaded.warning ?? null,
    legacyAvailable: persistence.legacy() !== undefined,
  }
  const persistenceMiddleware: Middleware<object, { animation: AnimationState }> = api => next => action => {
    const before = api.getState().animation
    let result
    let warning: string | null
    if (importEditorConfiguration.match(action)) {
      let imported: ReturnType<typeof snapshot>
      try { imported = snapshot(applyEditorConfig(before, decodeEditorConfig(action.payload, siteId).data)) }
      catch (error) {
        api.dispatch(setPersistenceNotice(error instanceof Error ? error.message : 'Invalid editor configuration.'))
        return action
      }
      result = next(restoreSavedEditor(imported))
      warning = before.menuFields.presistCharacters
        ? persistence.save(api.getState().animation, true) ?? 'Editor configuration imported and saved for this website.'
        : 'Editor configuration imported for this session only. Saving is disabled.'
    } else if (importLegacyCharacterSheet.match(action)) {
      const legacy = persistence.legacy()
      if (!before.menuFields.presistCharacters || !legacy) {
        warning = 'Legacy data is unavailable or saving is disabled.'
        result = next(action)
      } else {
        // Explicit user action only. The shared legacy key is never modified.
        result = next(restoreSavedEditor(legacy))
        warning = persistence.save(api.getState().animation, true)
      }
    } else {
      // Reset/clear use the published preset rather than the framework demo.
      // Ignore any caller-supplied reset payload: defaults are owned by the build.
      result = clearSavedCharacterSheet.match(action) ? next(clearSavedCharacterSheet(defaults ?? undefined))
        : resetCharacterSheet.match(action) ? next(resetCharacterSheet(defaults?.characterTracker))
        : next(action)
      const after = api.getState().animation
      if (clearSavedCharacterSheet.match(action)) warning = persistence.clear(after.menuFields.presistCharacters)
      else if (togglePersist.match(action) || (after.menuFields.presistCharacters && durableChanged(before, after))) warning = persistence.save(after)
      else return result
    }
    if (api.getState().animation.persistenceNotice !== warning) api.dispatch(setPersistenceNotice(warning))
    return result
  }
  return configureStore({
    reducer: { animation: AnimationSlice },
    preloadedState: { animation },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(persistenceMiddleware),
  })
}

export const store = createSiteStore(siteConfig.siteId, browserStorage, editorDefaults)
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
