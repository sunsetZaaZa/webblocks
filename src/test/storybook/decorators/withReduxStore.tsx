/* eslint-disable react-refresh/only-export-components */
import { useMemo, type ReactNode } from 'react'

import { configureStore } from '@reduxjs/toolkit'
import type { Decorator } from '@storybook/react-vite'
import { Provider } from 'react-redux'

import animationReducer from '../../../state-management/slices/AnimationSlice'
import type { AnimationState } from '../../../state-management/slices/presets/AnimationPreset'
import {
  createAnimationStateFixture,
  type AnimationStateFixturePatch,
} from '../fixtures/animationStateFixtures'

export type StorybookRootState = {
  animation: AnimationState
}

export type ReduxDecoratorParameters = {
  animationState?: AnimationStateFixturePatch
}

export const createStorybookStore = (
  animationState?: AnimationStateFixturePatch,
) => {
  return configureStore({
    reducer: {
      animation: animationReducer,
    },
    preloadedState: {
      animation: createAnimationStateFixture(animationState),
    },
  })
}

export type StorybookStore = ReturnType<typeof createStorybookStore>
export type StorybookDispatch = StorybookStore['dispatch']

const getReduxParameters = (parameters: Record<string, unknown>) => {
  return (parameters.redux ?? {}) as ReduxDecoratorParameters
}

type StorybookReduxProviderProps = {
  animationState?: AnimationStateFixturePatch
  children: ReactNode
}

function StorybookReduxProvider({
  animationState,
  children,
}: StorybookReduxProviderProps) {
  const store = useMemo(
    () => createStorybookStore(animationState),
    [animationState],
  )

  return <Provider store={store}>{children}</Provider>
}

export const withReduxStore: Decorator = (Story, context) => {
  const reduxParameters = getReduxParameters(context.parameters)

  return (
    <StorybookReduxProvider
      key={context.id}
      animationState={reduxParameters.animationState}
    >
      <Story />
    </StorybookReduxProvider>
  )
}
