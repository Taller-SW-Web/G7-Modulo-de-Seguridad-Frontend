/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base del backend G7 con /api/v1. Pública: nunca secretos con VITE_. */
  readonly VITE_API_BASE_URL?: string
  /** Login de Marketplace (G1) al que vuelve tras verificar el correo (FRONT-03). Pública. */
  readonly VITE_RETORNO_MARKETPLACE?: string
  /** Login al que vuelve el canal RETAIL tras verificar el correo (FRONT-03). Pública. */
  readonly VITE_RETORNO_RETAIL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
