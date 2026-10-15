// Errores transversales (FRONT-00 §2). Se ramifica por `code`; los mensajes son los de la spec.
import type { Problem } from './tipos'

/** Respuesta HTTP de error con su ProblemDetail y, si vino, Retry-After en segundos. */
export class ApiError extends Error {
  readonly status: number
  readonly problem: Problem
  readonly retryAfter: number | null

  constructor(status: number, problem: Problem, retryAfter: number | null) {
    super(problem.code ?? `HTTP_${status}`)
    this.name = 'ApiError'
    this.status = status
    this.problem = problem
    this.retryAfter = retryAfter
  }

  get code(): string | undefined {
    return this.problem.code
  }
}

/** Sin respuesta del servidor (red caída, CORS, DNS). No se reenvían formularios. */
export class RedError extends Error {
  constructor(causa?: unknown) {
    super('SIN_RESPUESTA', { cause: causa })
    this.name = 'RedError'
  }
}

export const MENSAJES = {
  validacionCampo: 'Revisa este campo.',
  permiso: 'No tienes permiso para realizar esta acción.',
  noEncontrado: 'No encontramos lo que buscas.',
  noDisponible: 'El servicio no está disponible en este momento. Intenta de nuevo en unos minutos.',
  sinRespuesta: 'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.',
  generico: 'Algo salió mal. Intenta de nuevo.',
} as const

/** Mensaje para la persona según FRONT-00 §2. Nunca muestra `detail` del servidor. */
export function mensajeDeError(error: unknown): string {
  if (error instanceof RedError) return MENSAJES.sinRespuesta
  if (!(error instanceof ApiError)) return MENSAJES.generico
  switch (error.code) {
    case 'SCOPE_INSUFICIENTE':
    case 'PERMISO_INSUFICIENTE':
    case 'ACCESO_DENEGADO':
      return MENSAJES.permiso
    case 'NO_ENCONTRADO':
      return MENSAJES.noEncontrado
    case 'NO_DISPONIBLE':
      return MENSAJES.noDisponible
    default:
      if (error.status === 403) return MENSAJES.permiso
      if (error.status === 503) return MENSAJES.noDisponible
      return error.problem.instance
        ? `${MENSAJES.generico} (Referencia: ${error.problem.instance})`
        : MENSAJES.generico
  }
}

/** Errores de `VALIDACION` agrupados por campo, para mostrarlos bajo cada input. */
export function erroresPorCampo(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || error.code !== 'VALIDACION') return {}
  const porCampo: Record<string, string> = {}
  for (const e of error.problem.errores ?? []) {
    if (e.campo && !porCampo[e.campo]) porCampo[e.campo] = e.mensaje || MENSAJES.validacionCampo
  }
  return porCampo
}
