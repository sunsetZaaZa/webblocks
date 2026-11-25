#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
if (args.length === 0 || args[0] === '--help') {
  console.log('Usage: webblocks-create --destination PATH --owner OWNER --repo REPO [--title TEXT --description TEXT --storybook true|false --editor true|false --roster empty|demo]')
} else {
  let temp
  try {
    const payload = JSON.parse(readFileSync(new URL('../starter.json', import.meta.url), 'utf8'))
    if (payload.schemaVersion !== 1 || !Array.isArray(payload.files)) throw new Error('Unsupported starter format')
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
    if (payload.version !== pkg.version) throw new Error('Starter version mismatch')
    const seen = new Set()
    for (const entry of payload.files) {
      if (typeof entry.path !== 'string' || !/^(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+$/.test(entry.path) || entry.path.split('/').some(p => ['.', '..', '.git', 'node_modules'].includes(p)) || seen.has(entry.path.toLowerCase())) throw new Error('Unsafe starter path')
      seen.add(entry.path.toLowerCase())
      const bytes = Buffer.from(entry.data, 'base64')
      if (bytes.toString('base64') !== entry.data || createHash('sha256').update(bytes).digest('hex') !== entry.sha256) throw new Error(`Starter integrity mismatch: ${entry.path}`)
    }
    temp = mkdtempSync(join(tmpdir(), 'webblocks-package-'))
    for (const entry of payload.files) {
      const target = join(temp, entry.path)
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, Buffer.from(entry.data, 'base64'), { flag: 'wx' })
    }
    const result = spawnSync(process.execPath, [join(temp, 'scripts/init-site.mjs'), 'create', ...args], { stdio: 'inherit' })
    if (result.error) throw result.error
    process.exitCode = result.status ?? 1
  } catch (error) {
    console.error(`Webblocks package: ${error.message}`)
    process.exitCode = 1
  } finally {
    if (temp) rmSync(temp, { recursive: true, force: true })
  }
}
