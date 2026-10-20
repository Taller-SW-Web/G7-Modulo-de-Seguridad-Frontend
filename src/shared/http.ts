// Cliente HTTP único de la SPA (ENTORNO-Y-REACT §4). Fetch nativo; Bearer y JSON;
// ProblemDetail y Retry-After; una sola renovación en vuelo por pestaña y, ante
// 401 TOKEN_INVALIDO, como mucho una repetición de la petición original.
import type { AlmacenSesion } from './almacenSesion'
import { ApiError, RedError } from './errores'
import { leerClaims } from './jwt'
import type { Problem, SesionIniciada } from './tipos'

export interface OpcionesPeticion {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
  /** Envía el access token y renueva una vez si caducó. Por defecto true. */
  autenticada?: boolean
  /** Misma conexión y coordinación de refresh; solo selecciona la versión publicada. */
  version?: 'v1' | 'v2'
  /** TOKEN_INVALIDO también puede describir una operación consumida: no repetirla. */
  renovarAnteTokenInvalido?: boolean
  /** Renueva antes de una mutación no repetible si el access vence en 60 s o no tiene exp legible. */
  renovarAntesDeEnviar?: boolean
}

export interface ClienteHttp {
  request<T>(ruta: string, opciones?: OpcionesPeticion): Promise<T>
}

/** Lo único que el cliente usa de fetch: URL ya resuelta e init. */
type Fetch = (url: string, init: RequestInit) => Promise<Response>

export function crearClienteHttp(
  baseUrl: string,
  almacen: AlmacenSesion,
  fetchImpl: Fetch = (url, init) => fetch(url, init),
): ClienteHttp {
  const base = baseUrl.replace(/\/+$/, '')
  let renovacionEnVuelo: Promise<boolean> | null = null

  async function enviar(ruta: string, opciones: OpcionesPeticion, accessToken: string | null): Promise<Response> {
    const cabeceras: Record<string, string> = { Accept: 'application/json, application/problem+json' }
    if (opciones.body !== undefined) cabeceras['Content-Type'] = 'application/json'
    if (accessToken) cabeceras.Authorization = `Bearer ${accessToken}`
    if (opciones.version === 'v2' && !base.endsWith('/v1')) throw new Error('La base debe terminar en /v1 para seleccionar v2')
    const destino = opciones.version === 'v2' ? base.replace(/\/v1$/, '/v2') : base
    try {
      return await fetchImpl(`${destino}${ruta}`, {
        method: opciones.method ?? 'GET',
        headers: cabeceras,
        body: opciones.body === undefined ? undefined : JSON.stringify(opciones.body),
        signal: opciones.signal,
        credentials: 'omit',
        cache: 'no-store',
        referrerPolicy: 'no-referrer',
      })
    } catch (causa) {
      if (causa instanceof DOMException && causa.name === 'AbortError') throw causa
      throw new RedError(causa)
    }
  }

  async function aError(respuesta: Response): Promise<ApiError> {
    let problem: Problem = {}
    try {
      problem = (await respuesta.json()) as Problem
    } catch {
      problem = {}
    }
    const retry = respuesta.headers.get('Retry-After')
    const segundos = retry !== null && /^\d+$/.test(retry) ? Number(retry) : null
    return new ApiError(respuesta.status, problem, segundos)
  }

  async function leer<T>(respuesta: Response): Promise<T> {
    if (respuesta.status === 204) return undefined as T
    const texto = await respuesta.text()
    return (texto ? JSON.parse(texto) : undefined) as T
  }

  /** Una sola renovación compartida; si el refresh es rechazado, la sesión termina. */
  function renovar(): Promise<boolean> {
    if (renovacionEnVuelo) return renovacionEnVuelo
    const tokens = almacen.tokens()
    if (!tokens) return Promise.resolve(false)
    const generacion = almacen.generacion()
    renovacionEnVuelo = (async () => {
      try {
        const respuesta = await enviar('/auth/refresh', { method: 'POST', body: { refreshToken: tokens.refreshToken } }, null)
        if (!respuesta.ok) {
          if (respuesta.status === 401 && almacen.generacion() === generacion) almacen.terminar('vencida')
          return false
        }
        const nueva = await leer<SesionIniciada>(respuesta)
        if (almacen.generacion() !== generacion) return false // se cerró mientras tanto
        almacen.aceptar(nueva)
        return true
      } catch {
        return false // sin red: no se repite a ciegas
      } finally {
        renovacionEnVuelo = null
      }
    })()
    return renovacionEnVuelo
  }

  return {
    async request<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
      const autenticada = opciones.autenticada ?? true
      const generacion = almacen.generacion()
      const tokens = almacen.tokens()
      if (autenticada && opciones.renovarAntesDeEnviar && tokens) {
        const exp = leerClaims(tokens.accessToken).exp
        if (exp === null || exp * 1000 - Date.now() <= 60_000) {
          if (!(await renovar())) {
            if (almacen.generacion() !== generacion) throw new DOMException('Sesión cerrada', 'AbortError')
            throw new RedError() // No se envió la mutación; se conserva la sesión si solo falló la red.
          }
        }
      }
      if (autenticada && almacen.generacion() !== generacion) throw new DOMException('Sesión cerrada', 'AbortError')
      const primera = await enviar(ruta, opciones, autenticada ? (almacen.tokens()?.accessToken ?? null) : null)
      if (primera.ok) {
        if (autenticada && almacen.generacion() !== generacion) throw new DOMException('Sesión cerrada', 'AbortError')
        return leer<T>(primera)
      }
      const error = await aError(primera)
      if (!autenticada || opciones.renovarAnteTokenInvalido === false || error.code !== 'TOKEN_INVALIDO' || !almacen.tokens()) throw error

      // El filtro rechaza antes de mutar, así que repetir una vez es seguro.
      if (!(await renovar())) throw error
      const segunda = await enviar(ruta, opciones, almacen.tokens()?.accessToken ?? null)
      if (!segunda.ok) throw await aError(segunda)
      return leer<T>(segunda)
    },
  }
}
