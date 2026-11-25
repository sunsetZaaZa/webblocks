import process from 'node:process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react-swc'
import { defineConfig, loadEnv } from 'vite'

import { loadSiteContent } from './config/site-content.mjs'
import { loadEditorDefaults } from './config/editor-defaults.mjs'
import { loadSiteConfig, resolveSiteConfig, renderSiteMetadata } from './config/site-config.mjs'

function toPort(value: string | undefined, fallback: number) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const projectDir = fileURLToPath(new URL('.', import.meta.url))
  const configPath = resolve(projectDir, env.WEBBLOCKS_CONFIG_FILE ?? 'webblocks.config.json')
  const site = resolveSiteConfig(loadSiteConfig(configPath, { optional: env.WEBBLOCKS_CONFIG_FILE === undefined }), mode, env)
  const content = loadSiteContent(configPath, resolve(projectDir, 'public'))
  const editorDefaults = loadEditorDefaults(configPath, site.siteId)
  const deployment = site.deployment
  const appPort = toPort(env.VITE_APP_PORT ?? env.APP_PORT, 5173)

  return {
    base: deployment.basePath,
    build: { sourcemap: false },
    plugins: [react(), {
      name: 'webblocks-site-metadata',
      transformIndexHtml: (html: string) => renderSiteMetadata(html, site.site),
    }],

    define: {
      __WEBBLOCKS_DEPLOYMENT__: JSON.stringify(deployment.profile),
      __WEBBLOCKS_SITE__: JSON.stringify(site),
      __WEBBLOCKS_CONTENT__: JSON.stringify(content),
      __WEBBLOCKS_EDITOR_DEFAULTS__: JSON.stringify(editorDefaults),
      __APP_ENV__: JSON.stringify(env.VITE_APP_ENV ?? env.APP_ENV ?? mode),
      __APP_PORT__: JSON.stringify(appPort),
    },

    // Only pin the port for actual `vite dev`, not when Vitest loads app modules.
    server:
      command === 'serve' && !process.env.VITEST
        ? { port: appPort }
        : undefined,
  }
})
