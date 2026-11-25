import { appendFile, mkdir, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { normalizeBasePath } from '../config/deployment.mjs'

// A missing path must not silently become root. The upstream action returns
// an empty string for root sites, so independently check its full base URL.
export function resolvePagesMetadata(env) {
  const { PAGES_BASE_URL: raw, PAGES_BASE_PATH: path, GITHUB_RUN_ID: run, GITHUB_RUN_ATTEMPT: attempt } = env
  if (typeof raw !== 'string' || !raw || /[\s\\]/.test(raw) || typeof path !== 'string') throw new Error('Missing or invalid GitHub Pages metadata')
  const url = new URL(raw)
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Invalid GitHub Pages base URL')
  // Reject ambiguous raw URL paths before URL normalization can hide traversal.
  const rawMatch = raw.match(/^https?:\/\/[^/]+(\/.*)?$/i)
  if (!rawMatch) throw new Error('Invalid GitHub Pages base URL')
  const rawPath = rawMatch[1] ?? '/'
  const basePath = normalizeBasePath(path === '' ? '/' : path)
  if (normalizeBasePath(rawPath) !== basePath || normalizeBasePath(url.pathname) !== basePath) throw new Error('GitHub Pages base URL and base path disagree')
  if (typeof run !== 'string' || typeof attempt !== 'string' || !/^[1-9][0-9]*$/.test(run) || !/^[1-9][0-9]*$/.test(attempt)) throw new Error('Missing or invalid GitHub Actions run identity')
  return { baseUrl: url.origin + basePath, basePath, artifactName: `github-pages-${run}-${attempt}` }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const metadata = resolvePagesMetadata(process.env)
  if (!process.env.GITHUB_OUTPUT) throw new Error('GITHUB_OUTPUT is required')
  await mkdir('test-results', { recursive: true })
  await writeFile('test-results/pages-metadata.json', JSON.stringify(metadata, null, 2) + '\n')
  await appendFile(process.env.GITHUB_OUTPUT, `base_path=${metadata.basePath}\nartifact_name=${metadata.artifactName}\n`)
  console.log(`Pages target: ${metadata.baseUrl}`)
}
