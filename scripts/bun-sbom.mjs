import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { readBunLock, assertManifestLock, reviewLock } from './security-review.mjs'

export function createSbom(pkg, lock) {
  assertManifestLock(pkg, lock)
  const { components, dependencies } = reviewLock(lock)
  const ref = key => key ? `bun:${key}` : 'webblocks:root'
  return {
    bomFormat: 'CycloneDX', specVersion: '1.5', version: 1,
    metadata: { component: { type: 'application', 'bom-ref': ref(''), name: pkg.name, version: pkg.version } },
    components: components.map(c => ({ type: 'library', 'bom-ref': ref(c.key), name: c.name, version: c.version,
      purl: `pkg:npm/${c.name.split('/').map(encodeURIComponent).join('/')}@${c.version}`,
      hashes: [{ alg: 'SHA-512', content: Buffer.from(c.integrity.slice(7), 'base64').toString('hex') }],
      externalReferences: [{ type: 'distribution', url: c.resolved }],
      properties: [{ name: 'webblocks:lock-path', value: c.key }, { name: 'webblocks:dev-only', value: String(c.dev) }],
    })),
    dependencies: Object.entries(dependencies).map(([key, deps]) => ({ ref: ref(key), dependsOn: deps.map(ref) })),
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const root = process.cwd(), pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    console.log(JSON.stringify(createSbom(pkg, readBunLock(root)), null, 2))
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
