# Test Configuration Boundaries

The project keeps Vite runtime configuration and Vitest test configuration separate.

## Runtime config

`vite.config.ts` owns the app runtime/dev-server settings only:

- React/Vite plugin setup
- app environment constants
- app dev-server port handling

It does not define Vitest projects or browser test behavior.

## Unit and visual test config

`vitest.config.ts` owns the non-Storybook test matrix:

| Project | Command | Purpose |
| --- | --- | --- |
| `unit` | `npm run test:unit` | Fast Node-based logic tests. Excludes Storybook stories and visual tests. |
| `visual` | `npm run test:visual` | Browser screenshot or layout tests under `tests/visual`. This remains opt-in. |

`npm test` intentionally maps to `test:unit` so the default test command stays fast and does not launch browser infrastructure.

## Storybook component test config

`vitest.storybook.config.ts` owns Storybook's Vitest integration:

| Project | Command | Purpose |
| --- | --- | --- |
| `storybook` | `npm run test:storybook` | Storybook component tests generated from stories. Uses Playwright Chromium. |

Storybook stays in a separate Vitest config so unit and visual runs do not load the Storybook plugin, scan stories, start Storybook, or print Storybook-specific warnings.

`npm run test:all` runs lint, production build, unit tests, and Storybook component tests. Visual tests stay separate because screenshot baselines can be slower and more environment-sensitive.
