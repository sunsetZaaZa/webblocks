import type { AnimationState } from '../../../state-management/slices/presets/AnimationPreset'
import { initialState } from '../../../state-management/slices/presets/AnimationPreset'
import { CharacterEditor, SettingsAreas } from '../../../state-management/slices/SliceStateSpecs'
import { UIBranch } from '../../../state-management/models/UIBranch'

import { characterFixtures, rosterCharacterFixtures } from './characterFixtures'

export type StorybookDeepPartial<T> = {
  [Property in keyof T]?: T[Property] extends readonly unknown[]
    ? T[Property]
    : T[Property] extends object
      ? StorybookDeepPartial<T[Property]>
      : T[Property]
}

export type AnimationStateFixturePatch = StorybookDeepPartial<AnimationState>

const cloneState = <T,>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value)) as T
}

const isMergeableObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export const mergeFixturePatch = <T extends object>(
  base: T,
  patch?: StorybookDeepPartial<T>,
): T => {
  if (!patch) {
    return base
  }

  const output: Record<string, unknown> = {
    ...(base as Record<string, unknown>),
  }
  const patchEntries = Object.entries(patch as Record<string, unknown>)

  for (const [key, patchValue] of patchEntries) {
    const baseValue = output[key]

    if (isMergeableObject(baseValue) && isMergeableObject(patchValue)) {
      output[key] = mergeFixturePatch(baseValue, patchValue)
      continue
    }

    output[key] = patchValue
  }

  return output as T
}

export const createAnimationStateFixture = (
  patch?: AnimationStateFixturePatch,
): AnimationState => {
  const baseState = cloneState(initialState)

  return mergeFixturePatch(baseState, patch)
}

export const animationStatePatches = {
  noneEditor: {
    characterEditor: CharacterEditor.none,
    settingsCurrentArea: SettingsAreas.menu,
    rosterPage: UIBranch.homepage,
    charSheetFields: {
      character: characterFixtures.emptyTemplate,
    },
  },
  templateEditor: {
    openControlPanel: true,
    openSettingsPanel: true,
    settingsCurrentArea: SettingsAreas.chracterSheet,
    characterEditor: CharacterEditor.template,
    rosterPage: UIBranch.homepage,
    charSheetFields: {
      character: characterFixtures.templateCrunch,
    },
  },
  rosterEditor: {
    openControlPanel: true,
    openSettingsPanel: true,
    settingsCurrentArea: SettingsAreas.chracterSheet,
    characterEditor: CharacterEditor.roster,
    rosterPage: UIBranch.homepage,
    charSheetFields: {
      character: characterFixtures.speakingCrunch,
    },
    characterTracker: [
      {
        page: UIBranch.homepage,
        chars: rosterCharacterFixtures.homepage,
      },
      {
        page: UIBranch.mobileapps,
        chars: rosterCharacterFixtures.mobileApps,
      },
      {
        page: UIBranch.contact,
        chars: rosterCharacterFixtures.contact,
      },
    ],
  },
  controllerOpen: {
    openControlPanel: true,
    openControllerPanel: true,
    openSettingsPanel: false,
    rosterPage: UIBranch.homepage,
  },
} satisfies Record<string, AnimationStateFixturePatch>

export const animationStateFixtures = {
  noneEditor: createAnimationStateFixture(animationStatePatches.noneEditor),
  templateEditor: createAnimationStateFixture(animationStatePatches.templateEditor),
  rosterEditor: createAnimationStateFixture(animationStatePatches.rosterEditor),
  controllerOpen: createAnimationStateFixture(animationStatePatches.controllerOpen),
}
