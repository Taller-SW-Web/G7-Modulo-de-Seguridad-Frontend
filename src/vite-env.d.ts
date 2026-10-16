/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base del backend G7 con /api/v1. Pública: nunca secretos con VITE_. */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
