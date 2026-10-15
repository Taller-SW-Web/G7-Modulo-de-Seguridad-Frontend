/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Sin VITE_API_BASE_URL absoluta, la SPA llama a /api/v1 en su mismo origen y este proxy
// lo reenvía al backend (G7_BACKEND_URL, por defecto el local). Así un solo enlace
// (p. ej. un túnel de demo) sirve front y API sin CORS. Solo afecta a dev/preview.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const proxy = { '/api': { target: env.G7_BACKEND_URL || 'http://localhost:8080', changeOrigin: false } }
  const hosts = (env.G7_HOSTS_PERMITIDOS || '').split(',').map((h) => h.trim()).filter(Boolean)
  return {
    plugins: [react()],
    server: { proxy, allowedHosts: hosts },
    preview: { proxy, allowedHosts: hosts },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      restoreMocks: true,
    },
  }
})
