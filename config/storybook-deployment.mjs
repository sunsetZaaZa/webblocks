import { normalizeBasePath } from './deployment.mjs'

// Storybook is a separate static site. Never inherit the application base,
// repository feature flags, published defaults or persistence identity.
export function storybookBasePath(env = {}, production = false) {
  const base = normalizeBasePath(env.WEBBLOCKS_STORYBOOK_BASE_PATH ?? '/')
  return production ? base : '/'
}
