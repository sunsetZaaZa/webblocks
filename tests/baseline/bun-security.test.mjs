import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseBunLock, readBunLock, assertManifestLock, reviewLock } from '../../scripts/security-review.mjs'
import { createSbom } from '../../scripts/bun-sbom.mjs'
import { validateAudit } from '../../scripts/bun-audit.mjs'
const root = fileURLToPath(new URL('../../', import.meta.url))
const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
const lock = readBunLock(root)

test('Bun text parsing preserves commas inside strings and removes only trailing commas', () => {
  assert.deepEqual(parseBunLock('{"a": ["x,}",], "b": "\\\"",}'), { a: ['x,}'], b: '"' })
  assert.throws(() => parseBunLock('{not: "json"}'))
})
test('lockfile synchronization checks dependency declarations and nested override selectors', () => {
  assertManifestLock(pkg, lock)
  const copy = structuredClone(lock); copy.workspaces[''].dependencies.nanoid = '0.0.0'
  assert.throws(() => assertManifestLock(pkg, copy), /dependencies differs/)
  delete copy.workspaces[''].dependencies.nanoid
  const overrides = structuredClone(lock); delete overrides.overrides
  assert.throws(() => assertManifestLock(pkg, overrides), /overrides differ/)
})
test('CycloneDX report covers every locked entry and references only declared components', () => {
  const report = createSbom(pkg, lock), inventory = reviewLock(lock)
  assert.equal(report.bomFormat, 'CycloneDX'); assert.equal(report.specVersion, '1.5')
  assert.equal(report.components.length, inventory.components.length)
  const refs = new Set([report.metadata.component['bom-ref'], ...report.components.map(c => c['bom-ref'])])
  assert.equal(refs.size, report.components.length + 1)
  assert.equal(report.dependencies.length, refs.size)
  for (const d of report.dependencies) { assert.ok(refs.has(d.ref)); assert.ok(d.dependsOn.every(r => refs.has(r))) }
  for (const c of report.components) assert.match(c.hashes[0].content, /^[a-f0-9]{128}$/)
  const damaged = structuredClone(lock); delete damaged.packages.nanoid
  assert.throws(() => createSbom(pkg, damaged), /Missing required lock entry/)
})
test('live Bun advisory gate rejects failures, invalid reports and high or critical entries', () => {
  const result = { status: 0, stdout: '{}' }
  assert.equal(validateAudit(result), 0)
  assert.equal(validateAudit({ ...result, stdout: JSON.stringify({ fixture: [{ severity: 'moderate', title: 'Example' }] }) }), 1)
  for (const change of [{ status: 1 }, { status: null, signal: 'SIGTERM' }, { error: new Error('timeout') }, { stdout: '' }, { stdout: '[]' }, { stdout: '{"error":"network failure"}' }, { stdout: '{"fixture":[]}' }, ...['high','critical'].map(severity => ({ stdout: JSON.stringify({ fixture: [{ severity, title: 'Example' }] }) }))]) assert.throws(() => validateAudit({ ...result, ...change }))
})
