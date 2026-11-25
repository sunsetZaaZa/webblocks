import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'

// Storybook owns static-directory handling. No application metadata or defaults.
export default defineConfig({ plugins: [react()], publicDir: false })
