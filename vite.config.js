import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  // Opsional (dev): teruskan /api ke backend agar tidak terkena CORS. Pakai bersama VITE_API_BASE_URL=/api.
  const proxyTarget = env.VITE_DEV_PROXY_TARGET
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
      host: true, // Izinkan akses dari perangkat lain di jaringan lokal (HP / Tablet)
      ...(proxyTarget
        ? { proxy: { '/api': { target: proxyTarget, changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, '') } } }
        : {}),
    },
  }
})
