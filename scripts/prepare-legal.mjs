import { lstatSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { reviewLock, readBunLock, assertManifestLock } from './security-review.mjs'

// Do not automatically publish a private checkout or accept a mutable source URL.
export function publicSourceUrl({ repository, revision, directory, isPrivate }) {
  if (isPrivate !== 'false') throw new Error('Public corresponding source is not established. Private repositories need a separately reviewed source distribution arrangement.')
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? '') || !/^[a-f0-9]{40}$/.test(revision ?? '') || typeof directory !== 'string' || (directory !== '.' && (!/^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(directory) || directory.split('/').some(p => ['.', '..', '.git'].includes(p))))) throw new Error('Invalid immutable source coordinates')
  return `https://github.com/${repository}/tree/${revision}${directory === '.' ? '' : '/' + directory}`
}
const json = path => JSON.parse(readFileSync(path, 'utf8'))
export function installedNotices(root) {
  const lock = readBunLock(root)
  const manifest = json(join(root, 'package.json'))
  assertManifestLock(manifest, lock)
  const { components } = reviewLock(lock)
  const byVersion = new Map()
  for (const c of components) {
    const id = `${c.name}@${c.version}`
    const previous = byVersion.get(id)
    byVersion.set(id, { ...c, dev: c.dev && (previous?.dev ?? true) })
  }
  const entries = [], texts = new Map()
  // The reviewed Bun install uses the hoisted layout. Inspect actual installed
  // package directories rather than assuming every optional platform package is present.
  function visitModules(directory, prefix) {
    let info
    try { info = lstatSync(directory) } catch (error) { if (error.code === 'ENOENT') return; throw error }
    if (!info.isDirectory()) throw new Error(`Invalid dependency directory: ${prefix}`)
    for (const name of readdirSync(directory).sort()) {
      if (name === '.bun') throw new Error('Expected hoisted Bun dependency installation')
      if (name.startsWith('.')) continue
      if (name.startsWith('@')) {
        const scope = join(directory, name)
        if (!lstatSync(scope).isDirectory()) throw new Error(`Linked dependency scope: ${name}`)
        for (const child of readdirSync(scope).sort()) visitPackage(join(scope, child), `${prefix}/${name}/${child}`, `${name}/${child}`)
      } else visitPackage(join(directory, name), `${prefix}/${name}`, name)
    }
  }
  function visitPackage(folder, path, name) {
    if (!lstatSync(folder).isDirectory()) throw new Error(`Invalid dependency directory: ${path}`)
    const pkg = json(join(folder, 'package.json'))
    const entry = byVersion.get(`${pkg.name}@${pkg.version}`)
    if (!entry || pkg.name !== name) throw new Error(`Installed package differs from lock: ${path}`)
    const licenses = []
    for (const name of readdirSync(folder).sort().filter(n => /^(?:licen[sc]e|copying|notice)(?:[._-].*)?$/i.test(n))) {
      const path = join(folder, name), file = lstatSync(path)
      if (!file.isFile() || file.size > 1024 * 1024) continue
      const text = readFileSync(path, 'utf8')
      if (text.includes('\u0000')) continue
      const key = `${pkg.name}@${pkg.version}/${name}`
      if (texts.has(key) && texts.get(key) !== text) throw new Error(`Conflicting license notice: ${key}`)
      texts.set(key, text); licenses.push(key)
    }
    entries.push({ name: pkg.name, version: pkg.version, path, license: pkg.license ?? null, dev: entry.dev, licenseFiles: licenses })
    visitModules(join(folder, 'node_modules'), path + '/node_modules')
  }
  visitModules(join(root, 'node_modules'), 'node_modules')
  for (const name of Object.keys({ ...manifest.dependencies, ...manifest.devDependencies })) {
    const version = components.find(c => c.key === name)?.version
    if (!entries.some(e => e.path === `node_modules/${name}` && e.version === version)) throw new Error(`Missing direct locked dependency: ${name}`)
  }
  if (!entries.length) throw new Error('No installed dependencies; install the locked graph first')
  return { entries, texts, missing: entries.filter(e => !e.license || !e.licenseFiles.length) }
}
export function prepareLegal(root, options) {
  const { entries, texts, missing } = installedNotices(root)
  const legal = join(root, 'dist/legal')
  if (!lstatSync(legal).isDirectory()) throw new Error('Expected copied legal directory')
  const output = join(root, 'test-results')
  mkdirSync(output, { recursive: true })
  writeFileSync(join(output, 'installed-license-inventory.json'), JSON.stringify({ entries, missing }, null, 2) + '\n')
  // Conservative superset: include notices from all installed build/runtime packages.
  // Not a determination of what was bundled or of legal compatibility.
  writeFileSync(join(legal, 'dependency-notices.txt'), [...texts].map(([name, text]) => `=== ${name} ===\n${text}\n`).join('\n'), { flag: 'wx' })
  writeFileSync(join(legal, 'dependency-inventory.json'), JSON.stringify({ entries, missing }, null, 2) + '\n', { flag: 'wx' })
  if (options) writeFileSync(join(legal, 'corresponding-source.txt'), `Webblocks (GPL-3.0-or-later)\nSource of this website revision: ${publicSourceUrl(options)}\nSee GPL-3.0.txt and repository build instructions.\nThird-party components retain their own licenses; see dependency notices and asset notices.\n`, { flag: 'wx' })
  console.log(`Collected notices for ${entries.length} installed dependency entries; ${missing.length} entries require further license evidence review.`)
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const env = process.env
    prepareLegal(process.cwd(), env.PUBLISH_PAGES === 'true' ? { repository: env.GITHUB_REPOSITORY, revision: env.GITHUB_SHA, directory: env.SITE_DIRECTORY, isPrivate: env.REPOSITORY_PRIVATE } : undefined)
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
