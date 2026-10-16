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
      tokens = { accessToken: sesion.accessToken, refreshToken: sesion.refreshToken }
      estado = {
        tipo: 'activa',
        usuario: sesion.usuario,
        permisos: Object.freeze(leerClaims(sesion.accessToken).permisos),
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
