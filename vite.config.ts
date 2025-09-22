// FIX: Import `process` from `node:process` to get correct type definitions for `process.cwd()`.
// This avoids using a triple-slash directive which was causing a "Cannot find type definition file" error.
import process from 'node:process';
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    }
  }
})
