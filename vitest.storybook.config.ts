import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vitest/config'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH

function chromiumProvider() {
  return playwright(
    chromiumExecutablePath
      ? { launchOptions: { executablePath: chromiumExecutablePath } }
      : {},
  )
}

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_ENV__: JSON.stringify('test'),
    __APP_PORT__: JSON.stringify(5173),
  },
  test: {
    passWithNoTests: true,
    projects: [
      {
        extends: true,
        plugins: [
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
            storybookScript: 'npm run storybook -- --no-open',
          }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: chromiumProvider(),
            instances: [{ browser: 'chromium' }],
          },
          setupFiles: ['./.storybook/vitest.setup.ts'],
        },
      },
    ],
  },
})
