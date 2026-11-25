import { readFileSync } from 'node:fs'
import { resolveDeployment, normalizeBasePath, repositoryBasePath } from './deployment.mjs'

const defaults = {
  schemaVersion: 1, siteId: 'auto',
  site: { title: 'React Website Editor', description: 'React, TypeScript and Vite website editor and presentation framework.', language: 'en-US' },
  repository: null,
  deployment: { target: 'local', basePath: 'auto', routing: 'auto' },
  storybook: { publish: true },
  editor: { enabled: true, persistence: 'local' },
  features: { characters: true, effects: true, animations: true },
}
const fail = (path, message) => { throw new Error(`Webblocks configuration: ${path} ${message}`) }
function record(value, path, keys) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail(path, 'must be an object')
  for (const key of Object.keys(value)) if (!keys.includes(key)) fail(`${path}.${key}`, 'is unknown')
  return value
}
function merge(value, path, base) {
  return value === undefined ? { ...base } : { ...base, ...record(value, path, Object.keys(base)) }
}
function oneOf(value, path, values) {
  if (!values.includes(value)) fail(path, `must be one of ${values.join(', ')}`)
}
function bool(value, path) { if (typeof value !== 'boolean') fail(path, 'must be a boolean') }
function plainText(value, path, max, empty = false) {
  if (typeof value !== 'string' || value.length > max || (!empty && !value.trim()) || /[\u0000-\u001f\u007f]/u.test(value)) fail(path, `must be ${empty ? 'a' : 'a nonempty'} string of at most ${max} characters without control characters`)
}
function repository(value, path) {
  if (value === null) return null
  record(value, path, ['owner', 'name'])
  if (typeof value.owner !== 'string' || typeof value.name !== 'string' || /[^A-Za-z0-9._-]/.test(value.owner) || /[^A-Za-z0-9._-]/.test(value.name) || value.owner.length > 39 || value.name.length > 100) fail(path, 'requires valid owner (up to 39 characters) and name (up to 100 characters)')
  try { repositoryBasePath(`${value.owner}/${value.name}`) } catch { fail(path, 'must identify a valid owner/repository') }
  return { owner: value.owner, name: value.name }
}
export function validateSiteConfig(input = {}) {
  record(input, 'root', Object.keys(defaults))
  const result = {
    schemaVersion: input.schemaVersion === undefined ? 1 : input.schemaVersion,
    siteId: input.siteId === undefined ? defaults.siteId : input.siteId,
    site: merge(input.site, 'site', defaults.site),
    repository: repository(input.repository === undefined ? null : input.repository, 'repository'),
    deployment: merge(input.deployment, 'deployment', defaults.deployment),
    storybook: merge(input.storybook, 'storybook', defaults.storybook),
    editor: merge(input.editor, 'editor', defaults.editor),
    features: merge(input.features, 'features', defaults.features),
  }
  if (result.schemaVersion !== 1) fail('schemaVersion', 'must be 1')
  if (typeof result.siteId !== 'string' || !/^[a-z0-9][a-z0-9._:/-]{0,159}$/.test(result.siteId) || /[^a-z0-9._:/-]/.test(result.siteId)) fail('siteId', 'must be auto or a lowercase identifier of 1–160 characters')
  plainText(result.site.title, 'site.title', 160)
  plainText(result.site.description, 'site.description', 500, true)
  try {
    if (typeof result.site.language !== 'string' || result.site.language.length > 64) throw new Error()
    result.site.language = Intl.getCanonicalLocales(result.site.language)[0]
    if (!result.site.language) throw new Error()
  } catch { fail('site.language', 'must be a valid BCP 47 language tag') }
  const d = result.deployment
  oneOf(d.target, 'deployment.target', ['local', 'github-pages', 'docker'])
  if (d.basePath !== 'auto') {
    if (typeof d.basePath !== 'string' || /[^A-Za-z0-9._/-]/.test(d.basePath)) fail('deployment.basePath', 'must be auto or a URL pathname')
    d.basePath = normalizeBasePath(d.basePath)
  }
  if (d.target === 'docker' && d.basePath !== 'auto' && d.basePath !== '/') fail('deployment.basePath', 'must be / or auto for Docker')
  oneOf(d.routing, 'deployment.routing', ['auto', 'hash', 'browser'])
  if (d.routing !== 'auto' && d.routing !== (d.target === 'github-pages' ? 'hash' : 'browser')) fail('deployment.routing', 'conflicts with the deployment target')
  bool(result.storybook.publish, 'storybook.publish')
  bool(result.editor.enabled, 'editor.enabled')
  oneOf(result.editor.persistence, 'editor.persistence', ['local'])
  for (const key of Object.keys(result.features)) bool(result.features[key], `features.${key}`)
  return result
}

export function loadSiteConfig(path, { optional = false } = {}) {
  let contents
  try { contents = readFileSync(path, 'utf8') } catch (error) {
    if (optional && error.code === 'ENOENT') return validateSiteConfig()
    throw new Error(`Cannot read Webblocks configuration ${path}: ${error.message}`)
  }
  let parsed
  try { parsed = JSON.parse(contents) } catch (error) { throw new Error(`Invalid JSON in Webblocks configuration ${path}: ${error.message}`) }
  return validateSiteConfig(parsed)
}

/** Resolve named deployment modes and explicit environment overrides before configuration defaults. */
export function resolveSiteConfig(config, mode, env = {}) {
  const c = validateSiteConfig(config)
  const named = ['local', 'github-pages', 'docker'].includes(mode)
  const profile = named ? mode : env.WEBBLOCKS_DEPLOYMENT ?? c.deployment.target
  const repo = env.GITHUB_REPOSITORY === undefined ? c.repository : (() => {
    const parts = env.GITHUB_REPOSITORY.split('/')
    if (parts.length !== 2) fail('GITHUB_REPOSITORY', 'must be owner/repository')
    return repository({ owner: parts[0], name: parts[1] }, 'GITHUB_REPOSITORY')
  })()
  if (repo && c.repository && `${repo.owner}/${repo.name}`.toLowerCase() !== `${c.repository.owner}/${c.repository.name}`.toLowerCase()) {
    fail('repository', 'conflicts with GITHUB_REPOSITORY; update the repository configuration')
  }
  const deployment = resolveDeployment(mode, {
    ...env,
    WEBBLOCKS_DEPLOYMENT: env.WEBBLOCKS_DEPLOYMENT ?? profile,
    WEBBLOCKS_BASE_PATH: env.WEBBLOCKS_BASE_PATH ?? (profile === c.deployment.target ? c.deployment.basePath : 'auto'),
    GITHUB_REPOSITORY: repo ? `${repo.owner}/${repo.name}` : undefined,
  })
  const siteId = c.siteId === 'auto' ? (repo ? `github:${repo.owner.toLowerCase()}/${repo.name.toLowerCase()}` : 'webblocks.local') : c.siteId
  if (c.siteId === 'auto' && !repo && deployment.profile === 'github-pages') fail('siteId', 'requires repository metadata or an explicit siteId for Pages')
  return {
    schemaVersion: 1, siteId, site: c.site, repository: repo,
    deployment: { ...deployment, routing: deployment.profile === 'github-pages' ? 'hash' : 'browser' },
    storybook: c.storybook, editor: c.editor, features: c.features,
  }
}

const escapeHtml = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
/** Replace the known index.html metadata slots, never interpret config as HTML. */
export function renderSiteMetadata(html, site) {
  return html.replace(/<html lang="[^"]*">/, () => `<html lang="${escapeHtml(site.language)}">`)
    .replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(site.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/>/, () => `<meta name="description" content="${escapeHtml(site.description)}" />`)
}
