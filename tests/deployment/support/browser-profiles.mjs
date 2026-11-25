import assert from 'node:assert/strict'

export const engines = Object.freeze(['chromium', 'firefox', 'webkit'])
export const profiles = Object.freeze(engines.flatMap(engine => [
  Object.freeze({ id: `${engine}-desktop`, engine, viewport: Object.freeze({ width: 1440, height: 900 }), hasTouch: false }),
  Object.freeze({ id: `${engine}-mobile`, engine, viewport: Object.freeze({ width: 390, height: 844 }), hasTouch: true }),
]))
export function contextOptions(profile = profiles[0]) {
  return { viewport: { ...profile.viewport }, hasTouch: profile.hasTouch, serviceWorkers: 'block', acceptDownloads: true }
}
export async function launchEngine(engine) {
  assert.ok(engines.includes(engine), `Unsupported browser engine: ${engine}`)
  const playwright = await import('playwright')
  // Never pass Chromium's executable override to another engine.
  const executablePath = engine === 'chromium' ? process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH : undefined
  return playwright[engine].launch(executablePath ? { executablePath } : {})
}
export function isNavigationCancellation(request) {
  // Only ignore canceled document navigations, not broken image/font/script requests.
  return request.isNavigationRequest() && /^(net::ERR_ABORTED|NS_BINDING_ABORTED|cancelled|canceled)$/i.test(request.failure()?.errorText ?? '')
}

// Run in the browser, using the actual rendered document (including an iframe
// when called on its body). Give React/style/layout a rendering turn before
// decoding the current images and waiting for fonts. Never hide request errors.
export async function settleDocumentAssets(body) {
  const doc = body.ownerDocument
  const win = doc.defaultView
  let timer
  try {
    await Promise.race([
      (async () => {
        await new Promise(resolve => win.requestAnimationFrame(() => win.requestAnimationFrame(resolve)))
        await Promise.all([...body.querySelectorAll('img[src]')].map(async image => {
          const source = image.currentSrc || image.src
          try { await image.decode() } catch (error) { throw new Error(`Image decode failed: ${source}: ${error.message}`) }
          if (!image.naturalWidth) throw new Error(`Image has no intrinsic width: ${source}`)
        }))
        await doc.fonts.ready
        for (const font of doc.fonts) {
          if (font.status === 'error') throw new Error(`Font failed: ${font.family}`)
        }
      })(),
      new Promise((_, reject) => { timer = win.setTimeout(() => reject(new Error('Timed out waiting for rendered images and fonts')), 15000) }),
    ])
  } finally { win.clearTimeout(timer) }
}

export async function waitForRenderedAssets(pageOrFrame) {
  await pageOrFrame.locator('body').evaluate(settleDocumentAssets)
}
