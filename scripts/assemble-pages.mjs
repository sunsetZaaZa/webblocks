import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { resolveConfig } from 'vite'
import { assembleStorybook } from '../tests/deployment/support/pages-bundle.mjs'

const config = await resolveConfig({ mode: 'github-pages' }, 'build', 'production', 'production')
const site = JSON.parse(config.define.__WEBBLOCKS_SITE__)
const report = await assembleStorybook({ directory: 'dist', base: config.base, publish: site.storybook.publish,
  build: async (directory, base) => {
    const result = spawnSync(process.execPath, [resolve('node_modules/storybook/dist/bin/dispatcher.js'), 'build', '--output-dir', directory], {
      env: { ...process.env, WEBBLOCKS_STORYBOOK_BASE_PATH: base, STORYBOOK_DISABLE_TELEMETRY: '1', CI: 'true' },
      stdio: 'inherit', timeout: 180000,
    })
    if (result.error) throw result.error
    if (result.status !== 0) throw new Error(`Storybook build failed (${result.status ?? result.signal})`)
  },
})
console.log(JSON.stringify(report))
