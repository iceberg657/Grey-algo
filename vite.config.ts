// FIX: Import `cwd` directly from `node:process` to get the current working directory
// without conflicting with global `process` types.
import { cwd } from 'node:process';
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, cwd(), '')
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    }
  }
})
