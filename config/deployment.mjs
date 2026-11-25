/** Build-time deployment configuration. No access to browser state or secrets. */
const profiles = new Set(['local', 'github-pages', 'docker'])
const segment = /^[A-Za-z0-9._-]+$/

/** Normalize a pathname, not an origin, URL, or filesystem path. */
export function normalizeBasePath(value) {
  if (typeof value !== 'string' || !value.startsWith('/')) {
    throw new Error('WEBBLOCKS_BASE_PATH must be an absolute URL pathname starting with /')
  }
  if (value === '/') return '/'
  const parts = value.replace(/\/$/, '').slice(1).split('/')
  if (parts.some(part => !segment.test(part) || part === '.' || part === '..')) {
    throw new Error('WEBBLOCKS_BASE_PATH contains an invalid path segment; use only letters, digits, dots, underscores and hyphens')
  }
  return `/${parts.join('/')}/`
}

export function repositoryBasePath(repository) {
  const parts = typeof repository === 'string' ? repository.split('/') : []
  if (parts.length !== 2 || parts.some(part => !segment.test(part) || part === '.' || part === '..')) {
    throw new Error('GitHub Pages requires GITHUB_REPOSITORY=owner/repository or an explicit WEBBLOCKS_BASE_PATH')
  }
  const [owner, name] = parts
  return name.toLowerCase() === `${owner.toLowerCase()}.github.io`
    ? '/'
    : normalizeBasePath(`/${name}`)
}

/** Named Vite modes select a profile; ordinary modes default to local. */
export function resolveDeployment(mode, env = {}) {
  const namedProfile = profiles.has(mode) ? mode : undefined
  const override = env.WEBBLOCKS_DEPLOYMENT
  if (override !== undefined && !profiles.has(override)) {
    throw new Error('WEBBLOCKS_DEPLOYMENT must be local, github-pages or docker')
  }
  if (namedProfile && override !== undefined && override !== namedProfile) {
    throw new Error(`WEBBLOCKS_DEPLOYMENT conflicts with Vite mode ${mode}`)
  }
  const profile = namedProfile ?? override ?? 'local'
  const configured = env.WEBBLOCKS_BASE_PATH
  let basePath
  let source
  if (configured !== undefined && configured !== 'auto') {
    // configure-pages reports an empty base_path for a root Pages site.
    basePath = normalizeBasePath(configured === '' && profile === 'github-pages' ? '/' : configured)
    source = 'explicit'
  } else if (profile === 'github-pages') {
    basePath = repositoryBasePath(env.GITHUB_REPOSITORY)
    source = 'repository'
  } else {
    basePath = '/'
    source = 'default'
  }
  // The supplied Dockerfile installs dist into the NGINX document root.
  if (profile === 'docker' && basePath !== '/') {
    throw new Error('The Docker profile serves from /; nested NGINX hosting is not configured')
  }
  return { profile, basePath, source }
}
