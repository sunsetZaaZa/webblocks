import type { SiteContent } from '../site/default-content.mjs'
export function validateSiteContent(input?: unknown, options?: { publicDir?: string }): SiteContent
export function loadSiteContent(configPath: string, publicDir: string): SiteContent
