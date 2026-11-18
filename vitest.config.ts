import process from 'node:process'

import { playwright } from '@vitest/browser-playwright'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vitest/config'

const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH

function chromiumProvider() {
  return playwright(
    chromiumExecutablePath
      ? { launchOptions: { executablePath: chromiumExecutablePath } }
      : {},
  )
}

const visualBrowserInstances = [
  { browser: 'chromium' as const },
  { browser: 'firefox' as const },

  // Mobile emulation (Android-ish) on Chromium.
  {
    browser: 'chromium' as const,
    name: 'Pixel 5',
    context: {
      viewport: { width: 393, height: 851 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2.75,
      userAgent:
        'Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    },
  },

  // Mobile emulation (iPhone-ish) on WebKit.
  {
    browser: 'webkit' as const,
    name: 'iPhone 13',
    context: {
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    },
  },
]

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
        test: {
          name: 'unit',
          environment: 'node',
          include: [
            'src/**/*.{test,spec}.{ts,tsx}',
            'tests/unit/**/*.{test,spec}.{ts,tsx}',
          ],
          exclude: [
            'src/**/*.stories.{ts,tsx}',
            'tests/visual/**',
            'node_modules/**',
            'dist/**',
            'storybook-static/**',
          ],
          browser: {
            enabled: false,
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'visual',
          include: ['tests/visual/**/*.{test,spec}.{ts,tsx}'],
          exclude: ['node_modules/**', 'dist/**', 'storybook-static/**'],
          browser: {
            enabled: true,
            provider: chromiumProvider(),
            headless: true,
            trace: 'retain-on-failure',
            instances: visualBrowserInstances,
            expect: {
              toMatchScreenshot: {
                comparatorName: 'pixelmatch',
                comparatorOptions: {
                  // threshold: 0.2,
                  // allowedMismatchedPixelRatio: 0.01,
                },
              },
            },
          },
        },
      },
    ],
  },
})
