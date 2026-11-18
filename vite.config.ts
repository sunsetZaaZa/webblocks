import process from 'node:process'

import react from '@vitejs/plugin-react-swc'
import { defineConfig, loadEnv } from 'vite'

function toPort(value: string | undefined, fallback: number) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const appPort = toPort(env.VITE_APP_PORT ?? env.APP_PORT, 5173)

  return {
    plugins: [react()],

    define: {
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
