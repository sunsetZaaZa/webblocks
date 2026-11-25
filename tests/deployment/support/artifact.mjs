import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { normalizeBasePath } from '../../../config/deployment.mjs'
import { inventory } from './static-host.mjs'

const origin = 'https://webblocks-artifact.invalid'
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
const decodeHtml = text => text.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, entity => {
  const value = entity.slice(1, -1).toLowerCase()
  if (value[0] === '#') {
    const n = value[1] === 'x' ? parseInt(value.slice(2), 16) : Number(value.slice(1))
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '\ufffd'
  }
  return { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' }[value]
})

// Inspect Vite-generated markup, not arbitrary HTML (the browser gate handles
// dynamically inserted DOM and actual network requests).
function htmlReferences(html) {
  const refs = []
  // Consume whole tags (including quoted > characters), comments and raw-text
  // elements before looking for another opening tag. In particular Storybook
  // emits JavaScript template literals containing <a href="${doc}"> in iframe.html.
  // Those strings are not static links; actual inserted DOM is browser-qualified.
  const tags = /<!--[\s\S]*?(?:-->|$)|<![^>]*>|<\/?([a-z][\w:-]*)(?=[\s/>])((?:"[^"]*"|'[^']*'|[^"'<>])*)>/gi
  const rawText = new Set(['script', 'style', 'textarea', 'title', 'xmp', 'iframe', 'noembed', 'noframes'])
  const referenceTags = new Set(['script', 'link', 'img', 'source', 'video', 'audio', 'a'])
  let match
  while ((match = tags.exec(html)) !== null) {
    if (!match[1] || match[0].startsWith('</')) continue
    const tag = match[1].toLowerCase()
    if (rawText.has(tag)) {
      const end = new RegExp(`</${tag}(?=[\\s/>])[^>]*>`, 'gi')
      end.lastIndex = tags.lastIndex
      const closing = end.exec(html)
      tags.lastIndex = closing ? end.lastIndex : html.length
    }
    if (!referenceTags.has(tag)) continue
    const attrs = Object.fromEntries([...match[2].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g)].map(m => [m[1].toLowerCase(), decodeHtml(m[2] ?? m[3] ?? m[4])]))
    if (tag === 'link' && !/\b(stylesheet|modulepreload|preload|icon|manifest|apple-touch-icon)\b/i.test(attrs.rel ?? '')) continue
    const key = tag === 'a' || tag === 'link' ? 'href' : 'src'
    if (attrs[key]) refs.push({ url: attrs[key], kind: tag === 'a' ? 'link' : 'asset', module: tag === 'script' && attrs.type === 'module' })
    if (tag === 'video' && attrs.poster) refs.push({ url: attrs.poster, kind: 'asset' })
    if (tag === 'img' || tag === 'source') {
      // Data URLs contain commas; leave those srcsets to the browser.
      if (attrs.srcset && !/\bdata:/i.test(attrs.srcset)) for (const candidate of attrs.srcset.split(',')) {
        const url = candidate.trim().split(/\s+/)[0]
        if (url) refs.push({ url, kind: 'asset' })
      }
    }
  }
  return refs
}
function cssReferences(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const urls = [...clean.matchAll(/\burl\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi)].map(m => m[1] ?? m[2] ?? m[3])
  for (const m of clean.matchAll(/@import\s+(?:"([^"]*)"|'([^']*)')/gi)) urls.push(m[1] ?? m[2])
  return urls
}

export async function inspectArtifact({ directory, base, publicDir, requireManifest = false, isolatedSubtree }) {
  base = normalizeBasePath(base)
  const files = await inventory(directory)
  const errors = [], checks = [], hashes = []
  const fail = (file, message) => errors.push(`${file}: ${message}`)
  let referenceCount = 0
  const checkRef = (from, raw, kind = 'asset') => {
    if (!raw || raw.startsWith('#') || /^(data:|blob:|mailto:|tel:)/i.test(raw)) return
    let url
    try { url = new URL(raw, origin + base + from.split('/').map(encodeURIComponent).join('/')) }
    catch { fail(from, `Invalid URL ${raw}`); return }
    if (!['http:', 'https:'].includes(url.protocol)) { fail(from, `Unsupported URL scheme ${raw}`); return }
    if (url.origin !== origin) return // external resources are outside artifact scope
    referenceCount++
    if (!url.pathname.startsWith(base)) { fail(from, `URL escapes deployment base: ${raw}`); return }
    if (isolatedSubtree && from.startsWith(isolatedSubtree) && !url.pathname.startsWith(base + isolatedSubtree)) { fail(from, `URL escapes isolated subtree: ${raw}`); return }
    let name
    try { name = decodeURIComponent(url.pathname.slice(base.length)) } catch { fail(from, `Invalid encoded URL ${raw}`); return }
    if (kind === 'link' && (name === '' || name.endsWith('/'))) name += 'index.html'
    if (!files.has(name)) fail(from, `Missing ${kind} ${raw} (expected ${name})`)
  }
  if (!files.has('index.html')) fail('index.html', 'Missing entry document')
  for (const [name, path] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
    const bytes = await readFile(path)
    hashes.push({ path: name, bytes: bytes.length, sha256: digest(bytes) })
    if (bytes.length === 0 && /\.(?:html|m?js|css|woff2?|ttf|otf|png|svg)$/i.test(name)) fail(name, 'Empty compiled resource')
    if (name.endsWith('.html')) {
      const html = bytes.toString('utf8')
      const refs = htmlReferences(html)
      if (name === 'index.html' && !refs.some(ref => ref.module && /\.m?js(?:[?#]|$)/i.test(ref.url) && !/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(ref.url))) fail(name, 'Missing compiled local module script')
      for (const ref of refs) checkRef(name, ref.url, ref.kind)
      if (name === 'index.html' && refs.some(ref => /(?:^|\/)src\/main\.tsx(?:[?#]|$)/.test(ref.url))) fail(name, 'Uncompiled source entry')
    } else if (name.endsWith('.css')) for (const url of cssReferences(bytes.toString('utf8'))) checkRef(name, url)
  }
  checks.push({ name: 'HTML and CSS local references', references: referenceCount })
  if (publicDir) {
    const originals = await inventory(publicDir)
    const byName = new Map(hashes.map(entry => [entry.path, entry]))
    for (const [name, path] of originals) {
      const copied = byName.get(name)
      if (!copied) fail(name, 'Public file missing from artifact')
      else if (copied.sha256 !== digest(await readFile(path))) fail(name, 'Public file differs from source')
    }
    checks.push({ name: 'Public files copied byte-for-byte', files: originals.size })
  }
  const manifestName = '.vite/manifest.json'
  if (files.has(manifestName)) {
    try {
      const manifest = JSON.parse(await readFile(files.get(manifestName), 'utf8'))
      if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest) || !Object.values(manifest).some(entry => entry?.isEntry)) throw new Error('Missing manifest entry')
      for (const [key, entry] of Object.entries(manifest)) {
        if (!entry || typeof entry.file !== 'string' || ['css', 'assets', 'imports', 'dynamicImports'].some(field => entry[field] !== undefined && (!Array.isArray(entry[field]) || entry[field].some(value => typeof value !== 'string')))) throw new Error(`Invalid manifest entry ${key}`)
        for (const name of [entry.file, ...(entry.css ?? []), ...(entry.assets ?? [])]) if (!files.has(name)) fail(manifestName, `Missing output ${name} for ${key}`)
        for (const dependency of [...(entry.imports ?? []), ...(entry.dynamicImports ?? [])]) if (!Object.hasOwn(manifest, dependency)) fail(manifestName, `Missing dependency ${dependency} for ${key}`)
      }
      checks.push({ name: 'Vite manifest references', entries: Object.keys(manifest).length })
    } catch (error) { fail(manifestName, error.message) }
  } else if (requireManifest) fail(manifestName, 'Required manifest missing')
  else checks.push({ name: 'Vite manifest references', status: 'not supplied' })
  return { base, passed: errors.length === 0, checks, errors, files: hashes }
}
