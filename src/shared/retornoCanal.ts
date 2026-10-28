// Retorno por canal tras verificar el correo (FRONT-03, RF-02.8, FEAT-01-T4). El enlace solo trae el
// nombre del canal; la URL sale de esta lista por entorno, así no hay redirección abierta.
// MARKETPLACE y RETAIL vuelven al mismo login de Marketplace (SPEC-02 RF-02.8, decisión del PO 26-oct).

export type CanalOrigen = 'WEB' | 'CHATBOT' | 'RETAIL' | 'MARKETPLACE'

type Configuracion = Partial<Record<'VITE_RETORNO_MARKETPLACE', string>>

const VARIABLE: Partial<Record<CanalOrigen, keyof Configuracion>> = {
  MARKETPLACE: 'VITE_RETORNO_MARKETPLACE',
  RETAIL: 'VITE_RETORNO_MARKETPLACE',
}

/** `canal` del enlace si pertenece a la lista cerrada; cualquier otra cosa vale `WEB`. */
export function canalDelEnlace(valor: string | null): CanalOrigen {
  return valor === 'CHATBOT' || valor === 'RETAIL' || valor === 'MARKETPLACE' ? valor : 'WEB'
}

/** Absoluta, https (http solo en localhost) y sin parámetros ni fragmento: si no, no se usa. */
function urlPermitida(valor: string | undefined): string | null {
  if (!valor?.trim()) return null
  let url: URL
  try {
    url = new URL(valor.trim())
  } catch {
    return null
  }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) return null
  if (url.username || url.password || url.search || url.hash) return null
  return url.href
}

/** Login externo del canal, o `null` para usar el nuestro (FRONT-01). */
export function retornoDelCanal(canal: CanalOrigen, configuracion: Configuracion = import.meta.env): string | null {
  const variable = VARIABLE[canal]
  return variable ? urlPermitida(configuracion[variable]) : null
}
