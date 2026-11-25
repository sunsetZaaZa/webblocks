import { createHash } from 'node:crypto'
import { lstatSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const json = path => JSON.parse(readFileSync(path, 'utf8'))
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex')
const fail = message => { throw new Error(message) }
// Bun's text lockfile is JSON with trailing commas. Strip only commas outside
// quoted strings; reject other syntax and unexpected lockfile/package shapes.
export function parseBunLock(text) {
  return JSON.parse(text.replace(/"(?:\\.|[^"\\])*"|,(?=\s*[}\]])/g, token => token === ',' ? '' : token))
}
export const readBunLock = root => parseBunLock(readFileSync(join(root, 'bun.lock'), 'utf8'))
const packageName = /^(?:@[a-z0-9_.-]+\/)?[a-z0-9_.-]+$/i
const nameParts = path => path.match(/@[^/]+\/[^/]+|[^/]+/g) ?? []
const validName = name => packageName.test(name) && name.split('/').every(part => !['.', '..', '@.', '@..'].includes(part))
function same(a, b) {
  const sorted = value => value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.keys(value).sort().map(k => [k, sorted(value[k])])) : value
  return JSON.stringify(sorted(a)) === JSON.stringify(sorted(b))
}
export function assertManifestLock(pkg, lock) {
  const workspace = lock.workspaces?.['']
  if (lock.lockfileVersion !== 3 || !workspace || Object.keys(lock.workspaces).length !== 1 || workspace.name !== pkg.name) fail('Bun lockfile workspace differs from manifest')
  for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) if (!same(workspace[field] ?? {}, pkg[field] ?? {})) fail(`Bun lockfile ${field} differs from manifest`)
  // Bun v3 stores scoped override selectors as nested objects.
  const flatten = (value, parent = '') => Object.fromEntries(Object.entries(value ?? {}).flatMap(([k, v]) => typeof v === 'string' ? [[parent + k, v]] : Object.entries(flatten(v, parent + k + '>'))))
  if (!same(flatten(lock.overrides), flatten(pkg.overrides))) fail('Bun lockfile overrides differ from manifest')
}
export function reviewLock(lock) {
  if (lock.lockfileVersion !== 3 || !lock.workspaces?.[''] || Object.keys(lock.workspaces).length !== 1 || !lock.packages || Array.isArray(lock.packages)) fail('Expected single-workspace Bun v3 text lockfile')
  const packages = Object.entries(lock.packages)
  if (!packages.length) fail('Empty dependency inventory')
  const components = packages.map(([path, entry]) => {
    const parts = nameParts(path)
    if (!parts.length || parts.join('/') !== path || parts.some(part => !validName(part))) fail('Unsafe dependency path')
    if (!Array.isArray(entry) || entry.length !== 4 || typeof entry[0] !== 'string' || !entry[2] || typeof entry[2] !== 'object' || Array.isArray(entry[2])) fail(`Unexpected locked entry: ${path}`)
    const name = parts.at(-1), version = entry[0].slice(name.length + 1)
    if (!entry[0].startsWith(name + '@') || !/^\d+\.\d+\.\d+(?:[-+][\w.+-]+)?$/.test(version)) fail(`Unapproved dependency: ${path}`)
    const expected = `https://registry.npmjs.org/${name}/-/${name.split('/').at(-1)}-${version}.tgz`
    if (entry[1] !== '' && entry[1] !== expected || !/^sha512-[A-Za-z0-9+/]{86}==$/.test(entry[3] ?? '')) fail(`Missing or unexpected registry integrity: ${path}`)
    return { path: parts.map(part => 'node_modules/' + part).join('/'), key: path, name, version, resolved: expected, integrity: entry[3], license: null, installScript: !!entry[2].hasInstallScript, bundled: !!entry[2].bundled }
  })
  const keys = new Set(components.map(c => c.key))
  // Resolve the nearest lock entry in the package's ancestor chain. Optional
  // dependencies and peers may be absent on a particular OS; required ones may not.
  const resolveDeps = (key, meta) => {
    const parts = key ? nameParts(key) : []
    const required = { ...meta.dependencies, ...meta.devDependencies }
    const optional = { ...meta.optionalDependencies, ...meta.peerDependencies }
    const result = new Set()
    for (const dep of Object.keys({ ...required, ...optional })) {
      if (!validName(dep)) fail(`Unsafe dependency name: ${dep}`)
      let match
      for (let i = parts.length; i >= 0; i--) {
        const candidate = [...parts.slice(0, i), dep].join('/')
        if (keys.has(candidate)) { match = candidate; break }
      }
      if (match) result.add(match)
      else if (Object.hasOwn(required, dep) && !Object.hasOwn(optional, dep)) fail(`Missing required lock entry: ${key || 'root'} -> ${dep}`)
    }
    return [...result].sort()
  }
  const workspace = lock.workspaces['']
  const dependencies = Object.fromEntries([['', resolveDeps('', workspace)], ...components.map(c => [c.key, resolveDeps(c.key, lock.packages[c.key][2])])])
  const runtime = new Set(), pending = resolveDeps('', { dependencies: workspace.dependencies, optionalDependencies: workspace.optionalDependencies, peerDependencies: workspace.peerDependencies })
  while (pending.length) { const key = pending.pop(); if (!runtime.has(key)) { runtime.add(key); pending.push(...dependencies[key]) } }
  for (const c of components) c.dev = !runtime.has(c.key)
  return { components, dependencies, missingLicense: components.filter(c => !c.license).map(c => c.path), installScripts: components.filter(c => c.installScript).map(c => c.path) }
}
// Deliberately narrow, high-confidence checks; not a replacement for secret scanning.
export function prohibitedPublicPath(path) {
  return path.split('/').some(part => /^(?:\.env(?:\.|$)|\.git(?:hub)?$|\.npmrc$|\.netrc$|\.ssh$|node_modules$|test-results$|webblocks\.defaults\.json$|webblocks\.config\.json$|package-lock\.json$|bun\.lock$|id_(?:rsa|ed25519|ecdsa)(?:\.pub)?$)/i.test(part)) || /\.(?:pem|key|p12|pfx|kdbx|map)$/i.test(path)
}
export function inspectPublicTree(directory) {
  const problems = []
  function walk(dir, prefix = '') {
    for (const name of readdirSync(dir)) {
      const path = prefix + name, full = join(dir, name), info = lstatSync(full)
      if (prohibitedPublicPath(path)) { problems.push(`${path}: prohibited public path`); continue }
      if (info.isDirectory()) { walk(full, path + '/'); continue }
      if (!info.isFile() || info.nlink !== 1) { problems.push(`${path}: linked or non-regular file`); continue }
      if (!/\.(?:html?|js|mjs|cjs|css|json|svg|txt|md|xml|ya?ml|csv)$/i.test(name)) continue
      const text = readFileSync(full, 'utf8')
      if (/-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----\s*[A-Za-z0-9+/]{32,}/.test(text) || /\bgh[pousr]_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{82}\b|\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/.test(text)) problems.push(`${path}: possible credential (value omitted)`)
    }
  }
  if (!lstatSync(directory).isDirectory()) fail('Expected real public directory')
  walk(directory)
  return problems
}
export function reviewAssets(root) {
  const manifest = json(join(root, 'public/legal/asset-notices.json'))
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.fonts) || !Array.isArray(manifest.artwork)) fail('Invalid asset notice manifest')
  const fontNames = readdirSync(join(root, 'src/assets/fonts')).sort()
  if (JSON.stringify(fontNames) !== JSON.stringify(manifest.fonts.map(f => f.path.split('/').at(-1)).sort())) fail('Unreviewed bundled font')
  for (const entry of manifest.fonts) {
    if (!/^src\/assets\/fonts\/[A-Za-z0-9._-]+$/.test(entry.path) || entry.license !== 'OFL-1.1' || !entry.copyright || !entry.embeddedLicense) fail('Missing font license evidence')
    const path = join(root, entry.path)
    if (!lstatSync(path).isFile() || hash(path) !== entry.sha256) fail(`Changed font: ${entry.path}`)
  }
  const artwork = json(join(root, 'docs/artwork/wgp-01/manifest.json')).assets
  if (JSON.stringify(artwork.map(a => `public/${a.path}`).sort()) !== JSON.stringify(manifest.artwork.map(a => a.path).sort())) fail('Incomplete artwork notice inventory')
  for (const entry of manifest.artwork) {
    if (!/^public\/[A-Za-z0-9_./-]+$/.test(entry.path) || !/^docs\/artwork\/wgp-01\/[A-Za-z0-9_./-]+$/.test(entry.source) || [entry.path, entry.source].some(p => p.split('/').includes('..'))) fail('Unsafe artwork notice path')
    for (const [path, expected] of [[entry.path, entry.sha256], [entry.source, entry.sourceSha256]]) if (!lstatSync(join(root, path)).isFile() || hash(join(root, path)) !== expected) fail(`Changed artwork: ${path}`)
  }
  if (hash(join(root, 'LICENSE')) !== hash(join(root, 'public/legal/GPL-3.0.txt'))) fail('GPL license copy differs')
  if (!readFileSync(join(root, 'public/legal/OFL-1.1.txt'), 'utf8').includes('SIL OPEN FONT LICENSE Version 1.1')) fail('Missing OFL license text')
  return { fonts: manifest.fonts.length, artwork: manifest.artwork.length }
}
export function assertPublicTree(directory) {
  const problems = inspectPublicTree(directory)
  if (problems.length) fail(problems.join('\n'))
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const root = process.cwd()
    if (process.argv[2] === '--artifact') assertPublicTree(join(root, 'dist'))
    else {
      const locked = readBunLock(root)
      assertManifestLock(json(join(root, 'package.json')), locked)
      const lock = reviewLock(locked)
      const assets = reviewAssets(root)
      assertPublicTree(join(root, 'public'))
      mkdirSync('test-results', { recursive: true })
      writeFileSync('test-results/security-inventory.json', JSON.stringify({ ...lock, assets, advisoryStatus: 'not evaluated by offline inventory' }, null, 2) + '\n')
      console.log(`${lock.components.length} locked dependencies; ${lock.missingLicense.length} missing lockfile license metadata; ${assets.fonts} fonts; ${assets.artwork} replacement artwork files`)
    }
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
