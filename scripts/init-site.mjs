import { constants, closeSync, copyFileSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { isDeepStrictEqual, parseArgs } from 'node:util'
import { resolveSiteConfig, validateSiteConfig } from '../config/site-config.mjs'
import { validateSiteContent } from '../config/site-content.mjs'
import { defaultContent } from '../site/default-content.mjs'
import { decodeEditorConfig } from '../src/state-management/editor-config.mjs'

const sourceRoot = fileURLToPath(new URL('../', import.meta.url))
const manifestPath = 'site/template-files.json'
const json = value => JSON.stringify(value, null, 2) + '\n'
const fail = message => { throw new Error(`Webblocks starter: ${message}`) }
const info = path => { try { return lstatSync(path) } catch (error) { if (error.code === 'ENOENT') return null; throw error } }
const readRegular = path => {
  if (!info(path)?.isFile()) fail(`Expected a regular file: ${path}`)
  return readFileSync(path, 'utf8')
}
const optionBoolean = (value, name) => {
  if (value !== 'true' && value !== 'false') fail(`${name} must be true or false`)
  return value === 'true'
}

export function starterFiles({ owner, repo, title = repo, description = 'Project website', language = 'en-US', storybook = true, editor = true, roster = 'empty' }) {
  if (typeof owner !== 'string' || !/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(owner) || owner.length > 39) fail('Provide a valid GitHub owner')
  if (typeof repo !== 'string' || !/^[A-Za-z0-9._-]{1,100}$/.test(repo) || ['.', '..'].includes(repo)) fail('Provide a valid GitHub repository name')
  if (!['empty', 'demo'].includes(roster)) fail('roster must be empty or demo')
  const config = validateSiteConfig({ repository: { owner, name: repo }, site: { title, description, language }, storybook: { publish: storybook }, editor: { enabled: editor } })
  const resolved = resolveSiteConfig(config, 'github-pages')
  const content = { schemaVersion: 1, enabledPages: ['home'], navigation: [{ page: 'home', label: 'homepage' }], pages: { home: { heading: title, hero: description.trim() || title, tagline: 'Project website' } } }
  validateSiteContent(content)
  const files = new Map([['webblocks.config.json', json(config)], ['site/content.json', json(content)]])
  if (roster === 'empty') {
    const defaults = { format: 'webblocks-editor-config', schemaVersion: 1, siteId: resolved.siteId, data: {
      characterTracker: Array.from({ length: 8 }, (_, i) => ({ page: i + 1, chars: [] })),
      menuFields: { targetFPS: 23, showFPS: false, runLength: 10, nonStop: false }, settingsFields: { juggleAnimationBounding: false },
    } }
    const raw = json(defaults)
    decodeEditorConfig(raw, resolved.siteId)
    files.set('webblocks.defaults.json', raw)
  }
  return { files, siteId: resolved.siteId, basePath: resolved.deployment.basePath }
}

// The explicit allowlist prevents accidentally copying .git, private environment
// files, personal editor exports, build output or unrelated repository content.
export function templateFiles(source = sourceRoot) {
  const entries = JSON.parse(readRegular(join(source, manifestPath)))
  if (!Array.isArray(entries) || !entries.includes(manifestPath)) fail('Invalid template manifest')
  const seen = new Set()
  for (const path of entries) {
    if (typeof path !== 'string' || !/^(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+$/.test(path) || path.split('/').some(p => ['.', '..', '.git', 'node_modules', 'dist', 'test-results', 'storybook-static'].includes(p)) || /(?:^|\/)\.env(?:\.|$)/.test(path) && path !== '.env.github-pages.example' || ['webblocks.config.json', 'site/content.json', 'webblocks.defaults.json'].includes(path)) fail(`Unsafe template path: ${path}`)
    if (/(?:^|\/)(?:\.npmrc|\.netrc|\.ssh|id_rsa|id_ed25519)(?:\/|$)|\.(?:pem|key|p12|pfx|kdbx)$/i.test(path)) fail(`Private template path: ${path}`)
    if (seen.has(path.toLowerCase())) fail(`Duplicate template path: ${path}`)
    seen.add(path.toLowerCase())
    let current = source
    for (const [index, part] of path.split('/').entries()) {
      current = join(current, part)
      const item = info(current)
      if (!(index === path.split('/').length - 1 ? item?.isFile() : item?.isDirectory())) fail(`Missing or non-regular template path: ${path}`)
    }
  }
  return entries
}

// Inspect every existing parent and reject symlinks and case-only collisions,
// even on case-sensitive systems. No files are written during preflight.
function inspectPath(root, path, directory = false) {
  let current = root
  const parts = path.split('/')
  for (const [index, part] of parts.entries()) {
    const parent = info(current)
    if (!parent) return
    if (!parent.isDirectory()) fail(`Directory collision: ${current}`)
    const matches = readdirSync(current).filter(name => name.toLowerCase() === part.toLowerCase())
    if (!matches.length) return
    if (matches.length !== 1 || matches[0] !== part) fail(`Case-insensitive collision: ${join(current, part)}`)
    current = join(current, part)
    const item = info(current)
    if (index === parts.length - 1 && !directory) fail(`File collision: ${current}`)
    if (!item?.isDirectory()) fail(`Directory collision: ${current}`)
  }
}
function ensureDirectory(path, created) {
  const existing = info(path)
  if (existing) { if (!existing.isDirectory()) fail(`Not a real directory: ${path}`); return }
  ensureDirectory(dirname(path), created)
  mkdirSync(path)
  created.push(path)
}
function createText(path, text, created) {
  const fd = openSync(path, 'wx')
  created.push(path)
  try { writeFileSync(fd, text) } finally { closeSync(fd) }
}
function cleanup(files, directories) {
  for (const path of files.reverse()) unlinkSync(path)
  for (const path of directories.reverse()) rmdirSync(path)
}

export function createStarter(destination, options, source = sourceRoot) {
  const requested = resolve(destination)
  // Canonicalize the existing parent so aliases cannot bypass the source-tree check.
  if (!info(dirname(requested))?.isDirectory()) fail('Destination parent must be an existing directory')
  const root = join(realpathSync(dirname(requested)), requested.split(sep).at(-1))
  const starter = starterFiles(options)
  const paths = templateFiles(source)
  const rel = relative(realpathSync(source), root)
  if (rel === '' || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + sep))) fail('Destination must be outside the source template')
  inspectPath(dirname(root), root.split(sep).at(-1), true)
  for (const path of [...paths, ...starter.files.keys()]) inspectPath(root, path)
  // A preexisting defaults file must not leak into a newly configured demo.
  if (!starter.files.has('webblocks.defaults.json')) inspectPath(root, 'webblocks.defaults.json')
  inspectPath(root, 'public/project', true)
  const created = [], directories = []
  try {
    ensureDirectory(root, directories)
    for (const path of [...paths, ...starter.files.keys()]) {
      const target = join(root, path)
      ensureDirectory(dirname(target), directories)
      if (starter.files.has(path)) createText(target, starter.files.get(path), created)
      else { copyFileSync(join(source, path), target, constants.COPYFILE_EXCL); created.push(target) }
    }
    ensureDirectory(join(root, 'public/project'), directories)
    return { ...starter, destination: root, copied: paths.length }
  } catch (error) {
    try { cleanup(created, directories) } catch (rollback) { fail(`${error.message}; cleanup incomplete: ${rollback.message}`) }
    throw error
  }
}

// Explicit initialization of a freshly cloned GitHub template. Only the two
// pristine demo JSON files may be replaced; user-customized files are refused.
export function initializeClone(root, options) {
  const starter = starterFiles(options)
  const originals = new Map()
  if (!info(root)?.isDirectory()) fail('Template root must be a real directory')
  if (!info(join(root, 'site'))?.isDirectory()) fail('Expected a real site directory')
  for (const [path, expected] of [['webblocks.config.json', validateSiteConfig()], ['site/content.json', defaultContent]]) {
    const raw = readRegular(join(root, path))
    if (info(join(root, path)).nlink !== 1) fail(`Refusing to replace hard-linked ${path}`)
    if (!isDeepStrictEqual(JSON.parse(raw), expected)) fail(`Refusing to replace customized ${path}; edit it manually`)
    originals.set(path, raw)
  }
  inspectPath(root, 'webblocks.defaults.json')
  inspectPath(root, 'public/project', true)
  const changed = [], created = [], directories = []
  try {
    for (const [path, contents] of starter.files) {
      const target = join(root, path)
      if (originals.has(path)) { changed.push(path); writeFileSync(target, contents) }
      else createText(target, contents, created)
    }
    ensureDirectory(join(root, 'public/project'), directories)
    return { ...starter, destination: root, copied: 0 }
  } catch (error) {
    try { for (const path of changed) writeFileSync(join(root, path), originals.get(path)); cleanup(created, directories) }
    catch (rollback) { fail(`${error.message}; cleanup incomplete: ${rollback.message}`) }
    throw error
  }
}

const usage = `Usage:
  bun scripts/init-site.mjs create --destination ../project --owner OWNER --repo REPO [options]
  bun scripts/init-site.mjs init --owner OWNER --repo REPO [options]
Options: --title TEXT --description TEXT --language en-US --storybook true|false --editor true|false --roster empty|demo
init replaces only pristine demonstration configuration in this template clone. create never overwrites files.`
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [command, ...args] = process.argv.slice(2)
    if (!command || command === '--help') console.log(usage)
    else {
      const { values } = parseArgs({ args, options: Object.fromEntries(['destination', 'owner', 'repo', 'title', 'description', 'language', 'storybook', 'editor', 'roster'].map(key => [key, { type: 'string' }])) })
      if (!['create', 'init'].includes(command) || (command === 'create') !== Boolean(values.destination)) fail(usage)
      const options = { ...values, storybook: optionBoolean(values.storybook ?? 'true', 'storybook'), editor: optionBoolean(values.editor ?? 'true', 'editor') }
      const result = command === 'create' ? createStarter(values.destination, options) : initializeClone(sourceRoot, options)
      console.log(`Initialized ${result.siteId} at ${result.destination}\nPages base path: ${result.basePath}\nReview configuration, run bun run test:baseline, then follow the adoption and deployment instructions in README.md.`)
    }
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
