import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Use process.cwd() directly which is standard in Node environments
  // Casting process to any to resolve TypeScript error about missing 'cwd' property on 'Process' interface
  const env = loadEnv(mode, (process as any).cwd(), '')
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    }
  }
})