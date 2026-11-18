# Storybook test decorators and fixtures

PR 4 adds Storybook-only test helpers so component stories can render without the production app shell.

## Decorators

Storybook now applies these global decorators from `.storybook/preview.tsx`:

- `withReduxStore` creates a fresh non-persisted Redux store for each story.
- `withRouter` wraps stories in a React Router `MemoryRouter`.
- `withPressedRootSurface` keeps the app-like Storybook canvas from PR 3.

The Redux decorator imports the animation reducer directly instead of using `src/state-management/store.ts`. This avoids `redux-persist`, browser storage, and shared persisted state during stories or component tests.

## Per-story Redux state

Use `parameters.redux.animationState` to patch the default animation state:

```ts
import { animationStatePatches } from '../../test/storybook/fixtures/animationStateFixtures'

export const RosterMode = {
  parameters: {
    redux: {
      animationState: animationStatePatches.rosterEditor,
    },
  },
}
```

The patch is deeply merged into a cloned copy of the app's animation initial state. Arrays are replaced rather than merged, which keeps rosters predictable.

## Per-story router state

Use `parameters.router` when a story needs a specific route:

```ts
export const MobileAppsRoute = {
  parameters: {
    router: {
      initialEntries: ['/mobileapps'],
    },
  },
}
```

## Fixtures

Shared fixtures live under `src/test/storybook/fixtures`:

- `animationStateFixtures.ts` contains reusable animation-state patches and full state fixtures.
- `characterFixtures.ts` contains deterministic character objects for template, roster, and speaking states.
- `hotkeyFixtures.ts` contains reusable hotkey and carousel data.

Use direct implementation-file imports instead of fixture barrel imports:

```ts
import { animationStatePatches } from '../../test/storybook/fixtures/animationStateFixtures'
import { characterFixtures } from '../../test/storybook/fixtures/characterFixtures'
import { hotkeyCarouselFixtures } from '../../test/storybook/fixtures/hotkeyFixtures'
```

## Harness story

`src/test/storybook/StorybookProviders.stories.tsx` is a small smoke story that proves Redux and Router are both available before component stories start leaning on them.
