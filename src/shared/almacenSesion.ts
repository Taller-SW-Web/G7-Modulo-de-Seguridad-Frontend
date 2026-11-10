// Sesión en memoria (FRONT-00 §1.1, ENTORNO-Y-REACT §4). Los tokens viven solo en
// este cierre: ni localStorage, ni sessionStorage, ni cookies, ni URL, ni consola.
// La UI recibe usuario y permisos; los tokens solo los lee el cliente HTTP.
import { leerClaims } from './jwt'
import type { SesionIniciada, UsuarioSesion } from './tipos'

/** Por qué terminó la sesión: decide el aviso que muestra el login. */
export type MotivoFin = 'cerrada' | 'vencida' | 'revocada'

export type EstadoSesion =
  | { tipo: 'sin-sesion'; motivo: MotivoFin | null }
  | { tipo: 'activa'; usuario: UsuarioSesion; permisos: readonly string[] }

interface Tokens {
  accessToken: string
  refreshToken: string
  /** Vencimiento del access en milisegundos epoch. */
  expiraEn: number
}

/**
 * Permisos de la sesión (FEAT-16). El backend los entrega en `usuario.permisos`
 * porque el access cifrado no se puede leer; si una respuesta antigua no los trae,
 * se leen del token sin verificar, solo para mostrar u ocultar opciones.
 */
export function permisosDe(sesion: SesionIniciada): string[] {
  return sesion.usuario.permisos ?? leerClaims(sesion.accessToken).permisos
}

/** Del token si se puede leer; si no (access cifrado), a partir de `expiresIn`. */
function vencimiento(sesion: SesionIniciada): number {
  const exp = leerClaims(sesion.accessToken).exp
  return exp !== null ? exp * 1000 : Date.now() + sesion.expiresIn * 1000
}

export interface AlmacenSesion {
  estado(): EstadoSesion
  suscribir(oyente: () => void): () => void
  aceptar(sesion: SesionIniciada): void
  terminar(motivo: MotivoFin): void
  /** Solo para el cliente HTTP. */
  tokens(): Tokens | null
  /** Generación actual: una respuesta tardía de una sesión ya cerrada no la restaura. */
  generacion(): number
}

export function crearAlmacenSesion(): AlmacenSesion {
  let tokens: Tokens | null = null
  let generacion = 0
  let estado: EstadoSesion = { tipo: 'sin-sesion', motivo: null }
  const oyentes = new Set<() => void>()
  const avisar = () => oyentes.forEach((o) => o())

  return {
    estado: () => estado,
    suscribir(oyente) {
      oyentes.add(oyente)
      return () => oyentes.delete(oyente)
    },
    aceptar(sesion) {
      tokens = { accessToken: sesion.accessToken, refreshToken: sesion.refreshToken, expiraEn: vencimiento(sesion) }
      estado = {
        tipo: 'activa',
        usuario: sesion.usuario,
        permisos: Object.freeze(permisosDe(sesion)),
      }
      avisar()
    },
    terminar(motivo) {
      tokens = null
      generacion += 1
      estado = { tipo: 'sin-sesion', motivo }
      avisar()
    },
    tokens: () => tokens,
    generacion: () => generacion,
  }
}
