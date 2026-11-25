import { mkdtempSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Vite/Rollup resolves source files to physical paths. On macOS the system
// temporary directory can use /var while the physical path is /private/var.
// Use the physical parent before creating the fixture so root and module IDs
// are in the same coordinate system. Do not rewrite user-configured paths.
export function createBuildFixture(prefix, parent = tmpdir()) {
  return mkdtempSync(join(realpathSync(parent), prefix))
}
