import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import react from '@vitejs/plugin-react-swc'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

const dirname = path.dirname(fileURLToPath(import.meta.url))
export default defineConfig({
  plugins: [react()],
  base: '/',
  publicDir: 'public',
  define: {
    __WEBBLOCKS_DEPLOYMENT__: JSON.stringify('local'),
    __APP_ENV__: JSON.stringify('test'),
    __APP_PORT__: JSON.stringify(5173),
  },
  test: {
    passWithNoTests: false,
    projects: [
      {
        extends: true,
        plugins: [
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
          }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }, { browser: 'firefox' }, { browser: 'webkit' }],
          },
        },
      },
    ],
  },
})
