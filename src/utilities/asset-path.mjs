/** Pure URL resolution shared by the Vite adapter and dependency-free tests. */
const invalidCharacters = /[\\\u0000-\u001f\u007f]/u
const scheme = /^[a-z][a-z\d+.-]*:/i
const localBase = /^\/(?:[A-Za-z0-9._-]+\/)*$/

/** Resolve an unprefixed public/ path against a canonical deployment base. */
export function resolvePublicAsset(path, base) {
  if (typeof base !== 'string' || !localBase.test(base) || base.split('/').some(part => part === '.' || part === '..')) {
    throw new TypeError('Expected a canonical Webblocks deployment base path')
  }
  if (typeof path !== 'string' || !path || path !== path.trim() || invalidCharacters.test(path) || path.startsWith('//') || scheme.test(path)) {
    throw new TypeError('Expected a site-relative public asset path')
  }
  const relative = path.replace(/^\//, '')
  const pathname = relative.split(/[?#]/, 1)[0]
  // Reject path escapes, including encoded dot segments and separators. Query
  // strings and fragments remain opaque and are preserved for cache busting/SVGs.
  for (const segment of pathname.split('/')) {
    let decoded
    try {
      decoded = decodeURIComponent(segment)
    } catch {
      throw new TypeError('Invalid percent encoding in public asset path')
    }
    if (!decoded || decoded === '.' || decoded === '..' || /[/\\]/.test(decoded) || invalidCharacters.test(decoded)) {
      throw new TypeError('Invalid public asset path segment')
    }
  }
  return base + relative
}

/** Runtime image inputs: preserve explicit media URLs, resolve local paths. */
export function resolveMediaAsset(value, base) {
  if (typeof value !== 'string' || !value || value !== value.trim() || invalidCharacters.test(value)) return undefined
  if (/^(?:https?:\/\/|\/\/|data:image\/|blob:)/i.test(value)) return value
  try {
    return resolvePublicAsset(value, base)
  } catch {
    return undefined
  }
}

/** Quote the resolved URL for a CSS background-image, not an HTML attribute. */
export function mediaBackgroundImage(value, base) {
  const url = resolveMediaAsset(value, base)
  return url === undefined ? undefined : `url(${JSON.stringify(url)})`
}
