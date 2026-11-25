import assert from 'node:assert/strict'
import { lstat, mkdtemp, readdir, rename, rm } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { normalizeBasePath } from '../../../config/deployment.mjs'
import { inventory } from './static-host.mjs'
import { qualifyStorybook, stories } from './storybook-qualify.mjs'

export const storybookMount = 'storybook'
export const pagesStorybookBase = base => normalizeBasePath(base) + storybookMount + '/'

// Reserve the entire top-level mount, including case variants, even on opt-out.
// Never delete or overwrite files that may belong to the main website.
export async function checkStorybookMount(directory, enabled) {
  const root = resolve(directory)
  assert.ok((await lstat(root)).isDirectory(), 'Pages artifact must be a real directory')
  const matches = (await readdir(root)).filter(name => name.toLowerCase() === storybookMount)
  if (!enabled) {
    assert.equal(matches.length, 0, 'Reserved Storybook mount collision: rebuild a clean application artifact')
    return null
  }
  assert.deepEqual(matches, [storybookMount], 'Expected exactly one Storybook mount')
  const target = join(root, storybookMount)
  assert.ok((await lstat(target)).isDirectory(), 'Storybook mount must be a real directory')
  return target
}

// Build into a temporary sibling, never into the application output. A failed
// build cannot leave a partly merged Storybook directory in dist/.
export async function assembleStorybook({ directory, base, publish, build }) {
  await checkStorybookMount(directory, false)
  if (!publish) return { status: 'disabled' }
  const root = resolve(directory)
  const nestedBase = pagesStorybookBase(base)
  const temporary = await mkdtemp(join(dirname(root), '.webblocks-storybook-'))
  try {
    await build(temporary, nestedBase)
    const files = await inventory(temporary)
    for (const name of ['index.html', 'iframe.html', 'index.json']) assert.ok(files.has(name), `Missing Storybook output ${name}`)
    await checkStorybookMount(root, false)
    await rename(temporary, join(root, storybookMount))
    return { status: 'assembled', base: nestedBase, files: files.size }
  } finally { await rm(temporary, { recursive: true, force: true }) }
}

export async function qualifyPagesStorybook({ directory, base, publish, publicDir, browserProfile }) {
  const target = await checkStorybookMount(directory, publish)
  if (!publish) return { status: 'disabled' }
  const report = await qualifyStorybook({ directory: target, base: pagesStorybookBase(base), publicDir, mountDirectory: directory, mountBase: base, browserProfile })
  return { ...report, status: report.passed ? 'passed' : 'failed' }
}

export function assertStorybookQualification(report, base, publish) {
  if (!publish) {
    assert.equal(report?.status, 'disabled', 'Storybook opt-out must be recorded in the qualification report')
    return
  }
  assert.ok(report?.status === 'passed' && report.passed === true && Array.isArray(report.errors) && report.errors.length === 0, `Successful Storybook browser qualification is required${report?.errors?.length ? ':\n' + report.errors.join('\n') : ''}`)
  assert.equal(report.base, pagesStorybookBase(base), 'Storybook qualification base differs from Pages metadata')
  assert.deepEqual(report.stories, Object.keys(stories), 'Storybook story coverage is incomplete')
}
