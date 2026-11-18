# Storybook preview setup

PR 3 keeps Storybook's global preview behavior in one place so component stories render with the same project-level surface before per-component decorators are added.

## Files

- `.storybook/preview.tsx` imports the app font/global CSS, registers the preview decorator, and owns shared Storybook parameters.
- `.storybook/preview.css` provides Storybook-only canvas styling without changing app runtime CSS.

## Global defaults

- Layout defaults to `centered`.
- The default background is `Pressed Root Dark`.
- Controls are expanded and sorted with required props first.
- Accessibility testing is configured to fail Storybook tests on axe violations.
- Viewport presets are available for responsive, desktop, tablet, and mobile checks.

## Story guidance

Stories should only override global preview settings when the component needs it. Use `parameters.layout = 'fullscreen'` for page-level compositions, and keep regular button/control stories on the centered default.
