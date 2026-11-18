/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react'

import type { Decorator } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router'

export type RouterDecoratorParameters = {
  initialEntries?: string[]
  initialIndex?: number
}

const defaultRouterParameters = {
  initialEntries: ['/'],
  initialIndex: 0,
} satisfies Required<RouterDecoratorParameters>

const getRouterParameters = (parameters: Record<string, unknown>) => {
  return {
    ...defaultRouterParameters,
    ...((parameters.router ?? {}) as RouterDecoratorParameters),
  }
}

type StorybookRouterProviderProps = Required<RouterDecoratorParameters> & {
  children: ReactNode
  storyId: string
}

function StorybookRouterProvider({
  children,
  initialEntries,
  initialIndex,
  storyId,
}: StorybookRouterProviderProps) {
  const routerKey = `${storyId}:${initialIndex}:${initialEntries.join('|')}`

  return (
    <MemoryRouter
      key={routerKey}
      initialEntries={initialEntries}
      initialIndex={initialIndex}
    >
      {children}
    </MemoryRouter>
  )
}

export const withRouter: Decorator = (Story, context) => {
  const routerParameters = getRouterParameters(context.parameters)

  return (
    <StorybookRouterProvider {...routerParameters} storyId={context.id}>
      <Story />
    </StorybookRouterProvider>
  )
}
