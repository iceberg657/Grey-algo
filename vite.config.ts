
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Use process.cwd() directly which is standard in Node environments
  const env = loadEnv(mode, (process as any).cwd(), '')
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.API_KEY_1': JSON.stringify(env.API_KEY_1),
      'process.env.API_KEY_2': JSON.stringify(env.API_KEY_2),
      'process.env.API_KEY_3': JSON.stringify(env.API_KEY_3),
      'process.env.API_KEY_4': JSON.stringify(env.API_KEY_4),
      'process.env.API_KEY_5': JSON.stringify(env.API_KEY_5),
      'process.env.API_KEY_6': JSON.stringify(env.API_KEY_6),
    }
  }
})
