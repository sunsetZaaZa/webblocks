/// <reference types="vite/client" />

// Public build profile; not an authentication or authorization mechanism.
declare const __WEBBLOCKS_DEPLOYMENT__: 'local' | 'github-pages' | 'docker'

declare const __WEBBLOCKS_SITE__: import('../config/site-config.mjs').ResolvedSiteConfig

declare const __WEBBLOCKS_EDITOR_DEFAULTS__: import('./state-management/editor-config.mjs').EditorConfigData | null

declare const __WEBBLOCKS_CONTENT__: import('../site/default-content.mjs').SiteContent
