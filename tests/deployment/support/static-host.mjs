import { createServer } from 'node:http'
import { readdir, readFile } from 'node:fs/promises'
import { join, extname, resolve } from 'node:path'
import { normalizeBasePath } from '../../../config/deployment.mjs'

const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.wasm': 'application/wasm', '.pdf': 'application/pdf',
}
export const contentType = file => types[extname(file).toLowerCase()] ?? 'application/octet-stream'

// Do not follow symlinks or special files. Pages artifacts must be self-contained.
export async function inventory(directory) {
  const root = resolve(directory)
  const files = new Map()
  async function walk(dir, prefix = '') {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const name = prefix + entry.name
      const path = join(dir, entry.name)
      if (entry.isDirectory()) await walk(path, name + '/')
      else if (entry.isFile()) files.set(name, path)
      else throw new Error(`Unsupported artifact entry: ${name}`)
    }
  }
  await walk(root)
  return files
}

// A deliberately strict static fixture, not a full emulation of the Pages CDN.
// Multiple mounts support independent sites on the same origin.
export async function serveStatic(mounts) {
  const sites = await Promise.all(mounts.map(async ({ directory, base }) => ({
    base: normalizeBasePath(base), files: await inventory(directory),
  })))
  if (!sites.length || new Set(sites.map(site => site.base)).size !== sites.length) throw new Error('Expected distinct static mounts')
  sites.sort((a, b) => b.base.length - a.base.length)
  const requests = []
  const server = createServer(async (req, res) => {
    const raw = req.url ?? ''
    const send = (status, body = '', headers = {}) => {
      requests.push({ method: req.method, url: raw, status })
      res.writeHead(status, { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers })
      res.end(req.method === 'HEAD' ? undefined : body)
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, '', { allow: 'GET, HEAD' })
    try {
      const rawPath = raw.split('?')[0]
      if (!rawPath.startsWith('/') || /%2f|%5c/i.test(rawPath)) return send(400)
      const path = decodeURIComponent(rawPath)
      if (/[\\\x00-\x1f\x7f]/.test(path) || path.split('/').some(p => p === '.' || p === '..')) return send(400)
      const site = sites.find(s => path.startsWith(s.base))
      if (!site) {
        const redirect = sites.find(s => path === s.base.slice(0, -1))
        return redirect ? send(308, '', { location: redirect.base + raw.slice(rawPath.length) }) : send(404)
      }
      const relative = path.slice(site.base.length)
      const name = relative === '' || relative.endsWith('/') ? relative + 'index.html' : relative
      const file = site.files.get(name)
      if (!file) return send(404)
      const body = await readFile(file)
      send(200, body, { 'content-type': contentType(name), 'content-length': body.length })
    } catch { send(400) }
  })
  await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done) })
  return {
    origin: `http://127.0.0.1:${server.address().port}`, requests,
    close: () => new Promise((done, reject) => {
      server.close(error => error ? reject(error) : done())
      server.closeAllConnections()
    }),
  }
}
