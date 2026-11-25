import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { readBunLock, assertManifestLock, reviewLock } from './security-review.mjs'

// Validate the complete report, including low/moderate entries. A broken audit
// service, malformed response or unsuccessful process must never qualify a build.
export function validateAudit(result) {
  let report
  try { report = JSON.parse(result.stdout) } catch { throw new Error('Bun audit did not return valid JSON') }
  if (!report || typeof report !== 'object' || Array.isArray(report)) throw new Error('Invalid Bun audit report')
  const findings = Object.values(report).flatMap(entries => {
    if (!Array.isArray(entries) || !entries.length || entries.some(e => !e || typeof e !== 'object' || !['low', 'moderate', 'high', 'critical'].includes(e.severity) || typeof e.title !== 'string')) throw new Error('Invalid Bun audit advisory entries')
    return entries
  })
  if (result.error || result.signal || result.status !== 0) throw new Error(`Bun audit exited unsuccessfully (${result.error?.message ?? result.signal ?? result.status}); ${findings.length} advisory entries`)
  if (findings.some(e => ['high', 'critical'].includes(e.severity))) throw new Error('Bun audit reported high or critical vulnerabilities')
  return findings.length
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const root = process.cwd(), locked = readBunLock(root)
    assertManifestLock(JSON.parse(readFileSync('package.json', 'utf8')), locked)
    reviewLock(locked)
    const digest = () => createHash('sha256').update(readFileSync('bun.lock')).digest('hex')
    const before = digest()
    const result = spawnSync(process.versions.bun ? process.execPath : 'bun', ['audit', '--json', '--audit-level=high'], { encoding: 'utf8', timeout: 120000, maxBuffer: 32 * 1024 * 1024, env: { ...process.env, NO_COLOR: '1' } })
    process.stdout.write(result.stdout ?? '')
    if (result.stderr) process.stderr.write(result.stderr)
    const count = validateAudit(result)
    if (before !== digest()) throw new Error('Bun lockfile changed during advisory check')
    console.error(`Bun advisory check passed: ${count} advisory entries; no high or critical findings`)
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
