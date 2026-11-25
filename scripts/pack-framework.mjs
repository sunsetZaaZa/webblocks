import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { makeArchive } from './archive.mjs'
import { templateFiles } from './init-site.mjs'
import { reviewAssets } from './security-review.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const json = value => JSON.stringify(value, null, 2) + '\n'
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
export function stageFramework(source, target) {
  reviewAssets(source)
  const paths = templateFiles(source).sort()
  const metadata = JSON.parse(readFileSync(join(source, 'packaging/package.json'), 'utf8'))
  const payload = paths.map(path => {
    const bytes = readFileSync(join(source, path))
    return { path, sha256: digest(bytes), data: bytes.toString('base64') }
  })
  // Package only the explicit public component dependency closure and artwork.
  // Full application source remains in starter.json, preserving starter files
  // such as bun.lock and .gitignore without renaming or losing bytes.
  const publicPaths = paths.filter(path => path.startsWith('public/') || path === 'src/public-api.ts' || path === 'src/types/CssCustomProperties.ts' || path.startsWith('src/utilities/asset-') || path === 'src/utilities/assetUrl.ts' || path.startsWith('src/components/Common/SemanticButton/') || ['squares', 'embers', 'webfall'].some(name => path === `src/components/Effects/${name}/${name === 'squares' ? 'fallingsquares' : name}.tsx` || path === `src/components/Effects/${name}/${name === 'squares' ? 'fallingsquares' : name}.scss`))
  for (const path of publicPaths) {
    mkdirSync(dirname(join(target, path)), { recursive: true })
    copyFileSync(join(source, path), join(target, path))
  }
  mkdirSync(join(target, 'bin'), { recursive: true })
  copyFileSync(join(source, 'packaging/create.mjs'), join(target, 'bin/create.mjs'))
  copyFileSync(join(source, 'packaging/components.d.ts'), join(target, 'components.d.ts'))
  copyFileSync(join(source, 'packaging/README.md'), join(target, 'README.md'))
  copyFileSync(join(source, 'LICENSE'), join(target, 'LICENSE'))
  writeFileSync(join(target, 'package.json'), json(metadata))
  writeFileSync(join(target, 'starter.json'), json({ schemaVersion: 1, version: metadata.version, files: payload }))
  return { metadata, publicPaths, payload }
}
export function packFramework(destination, source = root) {
  const dir = resolve(destination)
  mkdirSync(dir, { recursive: true })
  const staging = mkdtempSync(join(tmpdir(), 'webblocks-pack-'))
  try {
    const { metadata, publicPaths } = stageFramework(source, staging)
    const filename = `${metadata.name.replace(/^@/, '').replace('/', '-')}-${metadata.version}.tgz`
    if (existsSync(join(dir, filename)) || existsSync(join(dir, `${filename}.json`))) throw new Error(`Refusing to overwrite ${filename}; use a fresh output directory`)
    // Package the exact staged allowlist into an npm-compatible USTAR .tgz.
    // No lifecycle hooks, package manager invocation or ambient files.
    const actual = [...new Set([...publicPaths, 'package.json', 'components.d.ts', 'starter.json', 'bin/create.mjs', 'README.md', 'LICENSE'])].sort()
    const files = new Map(actual.map(path => [path, readFileSync(join(staging, path))]))
    const bytes = makeArchive(files, 'package', new Set(['bin/create.mjs']))
    const archive = join(dir, filename)
    const manifest = { name: metadata.name, version: metadata.version, filename, sha256: digest(bytes), integrity: 'sha512-' + createHash('sha512').update(bytes).digest('base64'), files: actual }
    writeFileSync(archive, bytes, { flag: 'wx' })
    try { writeFileSync(join(dir, `${filename}.json`), json(manifest), { flag: 'wx' }) }
    catch (error) { rmSync(archive); throw error }
    return { archive, manifest }
  } finally { rmSync(staging, { recursive: true, force: true }) }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2)
    if (args.length > 1) throw new Error('Usage: bun scripts/pack-framework.mjs [output-directory]')
    console.log(JSON.stringify(packFramework(args[0] ?? 'package-dist'), null, 2))
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
