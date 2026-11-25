import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { decodeEditorConfig } from '../../../src/state-management/editor-config.mjs'
import { storageKey } from '../../../src/state-management/persistence.mjs'
import { waitForRenderedAssets } from './browser-profiles.mjs'

export function expectedInteractions(site) {
  return { fonts: 'passed', effects: site.features.effects ? 'passed' : 'disabled',
    editor: site.editor.enabled ? 'passed' : 'disabled',
    characterSheet: site.editor.enabled && site.features.characters ? 'passed' : 'disabled',
    persistence: site.editor.enabled && site.features.characters ? 'passed' : 'disabled',
    interchange: site.editor.enabled ? 'passed' : 'disabled' }
}

export async function exerciseBrowser(page, profile, site, setPhase = () => {}) {
  const completed = {}
  // A fast sequence of editor actions can unmount images or tooltips before
  // Chromium finishes their no-store requests. Settle each rendered state.
  const activate = async locator => {
    await waitForRenderedAssets(page)
    if (profile.hasTouch) await locator.tap()
    else await locator.click()
    await waitForRenderedAssets(page)
  }
  const reload = async () => {
    await waitForRenderedAssets(page)
    assert.equal((await page.reload()).status(), 200)
    await toggle.waitFor()
    await loadEditorFonts()
    await waitForRenderedAssets(page)
  }
  const toggle = page.getByRole('button', { name: 'Editor Panel', exact: true })
  const wrench = page.locator('button').filter({ has: page.locator('img[src$="wrench.png"]') })
  const menuButton = page.getByRole('button', { name: 'Menu', exact: true })
  const exportButton = page.getByRole('button', { name: 'Export Website Configuration' })
  const key = storageKey(site.siteId)
  const readStorage = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
  const menu = async () => {
    if (!await wrench.isVisible()) await activate(toggle)
    if (!await menuButton.isVisible()) await activate(wrench)
    await activate(menuButton)
    await exportButton.waitFor()
  }
  const exportConfig = async () => {
    const pending = page.waitForEvent('download')
    await activate(exportButton)
    const download = await pending
    assert.equal(download.suggestedFilename(), 'webblocks.defaults.json')
    return decodeEditorConfig(await readFile(await download.path(), 'utf8'), site.siteId)
  }
  const loadEditorFonts = () => page.evaluate(async () => {
    for (const family of ['ChakraPetch', 'CorneritaBold', 'ShareTech', 'CorneritaRegular']) {
      const fonts = await document.fonts.load(`16px ${family}`)
      if (!fonts.length || fonts.some(font => font.status !== 'loaded')) throw new Error(`Font failed: ${family}`)
    }
  })
  setPhase('font readiness')
  await loadEditorFonts()
  completed.fonts = 'passed'
  const particles = page.locator('.falling-squares__item')
  if (site.features.effects) {
    const count = profile.viewport.width >= 900 ? 74 : 28
    await page.waitForFunction(count => document.querySelectorAll('.falling-squares__item').length === count, count)
    assert.equal(await particles.first().evaluate(el => getComputedStyle(el).animationPlayState), site.features.animations ? 'running' : 'paused')
    completed.effects = 'passed'
  } else { assert.equal(await particles.count(), 0); completed.effects = 'disabled' }
  if (!site.editor.enabled) {
    assert.equal(await toggle.count(), 0)
    return { ...completed, editor: 'disabled', characterSheet: 'disabled', persistence: 'disabled', interchange: 'disabled' }
  }
  // Use keyboard activation on desktop, actual Playwright tap on touch profiles.
  setPhase('open editor')
  if (profile.hasTouch) await activate(toggle)
  else { await toggle.focus(); await toggle.press('Enter'); await waitForRenderedAssets(page) }
  await wrench.waitFor()
  await menu()
  completed.editor = 'passed'
  const original = await exportConfig()
  if (site.features.characters) {
    setPhase('character sheet add')
    const persist = page.getByRole('checkbox', { name: 'Persist Characters' })
    if (!await persist.isChecked()) await activate(persist)
    await activate(page.getByRole('button', { name: 'Character Sheet', exact: true }))
    const template = page.locator('.scp_scrollbar').getByRole('button', { name: 'Crunch character' }).first()
    await activate(template)
    await activate(page.getByRole('button', { name: 'Add to Roster' }))
    await menu()
    const updated = await exportConfig()
    const before = original.data.characterTracker.find(entry => entry.page === 1).chars
    const after = updated.data.characterTracker.find(entry => entry.page === 1).chars
    assert.equal(after.length, before.length + 1, 'Character Sheet addition not committed')
    const added = after.find(character => !before.some(old => old.identifier === character.identifier))
    assert.ok(added)
    await activate(page.getByRole('button', { name: 'Character Sheet', exact: true }))
    setPhase('character sheet edit')
    const addedCharacter = page.locator('.characterRosterPanel').getByRole('button', { name: 'Crunch character' }).last()
    await activate(addedCharacter)
    const width = added.sizes.width === 61 ? 62 : 61
    await page.getByRole('spinbutton', { name: 'Character width' }).fill(String(width))
    await activate(page.getByRole('button', { name: 'Save to Roster' }))
    await menu()
    const edited = await exportConfig()
    assert.equal(edited.data.characterTracker.find(entry => entry.page === 1).chars.find(c => c.identifier === added.identifier).sizes.width, width)
    await activate(page.getByRole('button', { name: 'Character Sheet', exact: true }))
    await activate(addedCharacter)
    setPhase('character sheet remove')
    await activate(page.getByRole('button', { name: 'Remove from Roster' }))
    await menu()
    const removed = await exportConfig()
    assert.deepEqual(removed.data.characterTracker.find(entry => entry.page === 1).chars, before)
    completed.characterSheet = 'passed'
  } else {
    assert.equal(await page.getByRole('button', { name: 'Character Sheet', exact: true }).count(), 0)
    completed.characterSheet = 'disabled'
  }
  setPhase('configuration import/export')
  const changed = await exportConfig()
  changed.data.menuFields.targetFPS = changed.data.menuFields.targetFPS === 47 ? 48 : 47
  const file = page.getByLabel('Website configuration file')
  page.once('dialog', dialog => dialog.accept())
  await file.setInputFiles({ name: 'webblocks.defaults.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(changed)) })
  await page.getByRole('status').filter({ hasText: /imported (and saved|for this session)/ }).waitFor()
  assert.deepEqual(await exportConfig(), changed)
  await file.setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{invalid') })
  await page.getByRole('status').filter({ hasText: 'not valid JSON' }).waitFor()
  assert.deepEqual(await exportConfig(), changed)
  completed.interchange = 'passed'
  if (site.features.characters) {
    setPhase('persistence reload and opt-out')
    assert.equal((await readStorage()).data.menuFields.targetFPS, changed.data.menuFields.targetFPS)
    await reload(); await menu()
    assert.deepEqual(await exportConfig(), changed)
    const persist = page.getByRole('checkbox', { name: 'Persist Characters' })
    await activate(persist)
    await reload(); await menu()
    assert.equal(await persist.isChecked(), false)
    assert.deepEqual(await readStorage(), { version: 1, siteId: site.siteId, enabled: false })
    const reset = await exportConfig()
    // Built-in demo identifiers are generated anew on reload; published IDs are stable.
    assert.deepEqual(reset.data.menuFields, original.data.menuFields)
    assert.deepEqual(reset.data.characterTracker.map(entry => entry.chars.length), original.data.characterTracker.map(entry => entry.chars.length))
    completed.persistence = 'passed'
  } else completed.persistence = 'disabled'
  return completed
}
