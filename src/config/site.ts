import type { ResolvedSiteConfig } from '../../config/site-config.mjs'

// Storybook's standalone components and non-Vite consumers retain the original
// enabled feature set. Application builds always inject the validated config.
const standalone: ResolvedSiteConfig = {
  schemaVersion: 1,
  siteId: 'webblocks.local',
  site: { title: 'React Website Editor', description: 'React, TypeScript and Vite website editor and presentation framework.', language: 'en-US' },
  repository: null,
  deployment: { profile: 'local', basePath: '/', source: 'default', routing: 'browser' },
  storybook: { publish: true },
  editor: { enabled: true, persistence: 'local' },
  features: { characters: true, effects: true, animations: true },
}

export const siteConfig = typeof __WEBBLOCKS_SITE__ === 'undefined' ? standalone : __WEBBLOCKS_SITE__

export const editorDefaults = typeof __WEBBLOCKS_EDITOR_DEFAULTS__ === 'undefined' ? null : __WEBBLOCKS_EDITOR_DEFAULTS__
