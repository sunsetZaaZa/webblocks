import { readFileSync, lstatSync, realpathSync } from 'node:fs'
import { dirname, resolve, relative, isAbsolute, sep } from 'node:path'
import { defaultContent } from '../site/default-content.mjs'
import { routes } from '../src/routing/routes.mjs'
import { resolvePublicAsset } from '../src/utilities/asset-path.mjs'

const fail = (field, reason) => { throw new Error(`Invalid site content ${field}: ${reason}`) }
const has = (o, k) => Object.hasOwn(o, k)
function object(value, allowed, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(field, 'expected an object')
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`${field}.${key}`, 'unknown field')
  return value
}
function text(value, field, required = false) {
  if (typeof value !== 'string' || value.length > 20000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value) || (required && !value.trim())) fail(field, 'expected valid text')
  return value
}
function pageKey(value, field) {
  if (typeof value !== 'string' || !has(routes, value)) fail(field, 'unknown page')
  return value
}
function artwork(value, field, publicDir) {
  text(value, field, true)
  // Keep repository-owned images self-contained and portable. No remote, query,
  // fragment, or encoded paths; URL resolution remains centralized in assetUrl.
  if (!/^(?:[A-Za-z0-9_-][A-Za-z0-9._-]*\/)*[A-Za-z0-9_-][A-Za-z0-9._-]*\.(?:png|jpe?g|svg|gif|webp|avif|ico)$/i.test(value)) fail(field, 'expected an unprefixed public image path')
  resolvePublicAsset(value, '/')
  if (publicDir) {
    const root = realpathSync(publicDir)
    const target = resolve(root, value)
    try {
      const actual = realpathSync(target)
      const rel = relative(root, actual)
      if (rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel) || actual !== target || !lstatSync(target).isFile()) fail(field, 'expected a regular public image without symlinks')
    } catch (error) { fail(field, `cannot use public/${value}: ${error.message}`) }
  }
  return value
}
export function validateSiteContent(input = {}, { publicDir } = {}) {
  object(input, ['schemaVersion', 'enabledPages', 'navigation', 'pages'], 'root')
  if (has(input, 'schemaVersion') && input.schemaVersion !== 1) fail('schemaVersion', 'unsupported version')
  const result = structuredClone(defaultContent)
  if (has(input, 'enabledPages')) {
    if (!Array.isArray(input.enabledPages)) fail('enabledPages', 'expected an array')
    const keys = input.enabledPages.map(key => pageKey(key, 'enabledPages'))
    if (!keys.includes('home') || new Set(keys).size !== keys.length) fail('enabledPages', 'home is required and pages must be unique')
    // Stable registration order regardless of the input order.
    result.enabledPages = result.enabledPages.filter(key => keys.includes(key))
  }
  if (has(input, 'navigation')) {
    if (!Array.isArray(input.navigation) || input.navigation.length > Object.keys(routes).length) fail('navigation', 'expected a page array')
    result.navigation = input.navigation.map((entry, i) => {
      object(entry, ['page', 'label'], `navigation.${i}`)
      const page = pageKey(entry.page, `navigation.${i}.page`)
      if (!result.enabledPages.includes(page)) fail(`navigation.${i}.page`, 'page is disabled')
      return { page, label: text(entry.label, `navigation.${i}.label`, true) }
    })
  } else result.navigation = result.navigation.filter(entry => result.enabledPages.includes(entry.page))
  if (result.navigation[0]?.page !== 'home' || new Set(result.navigation.map(entry => entry.page)).size !== result.navigation.length) fail('navigation', 'home must be first and pages must be unique')
  const pages = has(input, 'pages') ? object(input.pages, Object.keys(routes), 'pages') : {}
  for (const [key, defaults] of Object.entries(defaultContent.pages)) {
    const overrides = has(pages, key) ? object(pages[key], Object.keys(defaults), `pages.${key}`) : {}
    for (const [field, fallback] of Object.entries(defaults)) {
      const value = has(overrides, field) ? overrides[field] : fallback
      const path = `pages.${key}.${field}`
      if (['icon', 'image'].includes(field)) result.pages[key][field] = artwork(value, path, result.enabledPages.includes(key) ? publicDir : undefined)
      else if (Array.isArray(fallback)) {
        if (!Array.isArray(value) || value.length > 100) fail(path, 'expected at most 100 text entries')
        result.pages[key][field] = value.map((item, i) => text(item, `${path}.${i}`, true))
      } else result.pages[key][field] = text(value, path, fallback !== '')
    }
  }
  return result
}

// Content is selected alongside webblocks.config.json. Missing overrides retain
// the demonstration; present but malformed files must fail the build.
export function loadSiteContent(configPath, publicDir) {
  const path = resolve(dirname(configPath), 'site/content.json')
  try {
    const info = lstatSync(path)
    if (!info.isFile() || info.size > 1024 * 1024) fail('file', 'expected a regular JSON file of at most 1 MiB')
  } catch (error) {
    if (error.code === 'ENOENT') return validateSiteContent({}, { publicDir })
    throw error
  }
  try { return validateSiteContent(JSON.parse(readFileSync(path, 'utf8')), { publicDir }) }
  catch (error) { throw new Error(`Cannot load ${path}: ${error.message}`) }
}
