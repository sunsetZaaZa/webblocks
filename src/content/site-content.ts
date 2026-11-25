import { defaultContent, type PageKey } from '../../site/default-content.mjs'

// Standalone component consumers retain the original demonstration content.
export const siteContent = typeof __WEBBLOCKS_CONTENT__ === 'undefined' ? defaultContent : __WEBBLOCKS_CONTENT__
export const pageEnabled = (key: PageKey) => siteContent.enabledPages.includes(key)
