// Suite E2E de la SPA — FEAT-12-T3 (plan H4 §3, tablero tareas/hito-4/jose-limachi).
// El stack de pruebas (backend + PostgreSQL + receptor de correo) se levanta
// aparte: ver e2e/README.md. Sin E2E_BASE_URL, Playwright sirve la propia SPA
// con `vite dev` (proxy /api → backend local) y los tests hablan contra ese
// origen; con E2E_BASE_URL definida no arranca ningún servidor (p. ej. CI).
import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'
const local = process.env.E2E_BASE_URL === undefined

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL,
    locale: 'es-PE',
    timezoneId: 'America/Lima',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  ...(local
    ? {
        webServer: {
          command: 'npm run dev',
          url: baseURL,
          reuseExistingServer: true,
          timeout: 60_000,
        },
      }
    : {}),
})
