import process from 'node:process'
import { fileURLToPath } from 'node:url'
import type { StorybookConfig } from '@storybook/react-vite'
import { storybookBasePath } from '../config/storybook-deployment.mjs'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-vitest'],
  framework: {
    name: '@storybook/react-vite',
    options: { builder: { viteConfigPath: fileURLToPath(new URL('./vite.config.ts', import.meta.url)) } },
  },
  staticDirs: ['../public'],
  core: { disableTelemetry: true },
  viteFinal: async (config, { configType }) => ({
    ...config,
    build: { ...config.build, sourcemap: false },
    base: storybookBasePath(process.env, configType === 'PRODUCTION' && process.env.VITEST !== 'true'),
  }),
}

export default config
