// Instancia única del cliente y endpoints del contrato que consume la SPA en H3.
import { crearAlmacenSesion } from './almacenSesion'
import { crearClienteHttp, type ClienteHttp } from './http'
import type {
  CodigoRol,
  CambioMfaEnviado,
  DesafioMfa,
  EstadoCuenta,
  OtpEnviado,
  PaginaActividad,
  PaginaUsuarios,
  PoliticaPassword,
  SesionIniciada,
  Usuario,
} from './tipos'

/** Única variable pública de build (README). Nunca secretos con prefijo VITE_. */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1'

export const almacenSesion = crearAlmacenSesion()
export const http: ClienteHttp = crearClienteHttp(API_BASE_URL, almacenSesion)

export interface FiltrosUsuarios {
  estado?: EstadoCuenta
  rol?: CodigoRol
  correo?: string
  pagina?: number
  tamano?: number
}

export function crearApi(cliente: ClienteHttp) {
  return {
    mfaSolicitar: (accion: 'HABILITAR' | 'DESHABILITAR') =>
      cliente.request<CambioMfaEnviado>('/auth/mfa/cambios', {
        method: 'POST', version: 'v2', renovarAnteTokenInvalido: false, body: { accion },
      }),
    mfaReenviar: (mfaChangeToken: string) =>
      cliente.request<CambioMfaEnviado>('/auth/mfa/cambios/reenviar', {
        method: 'POST', version: 'v2', renovarAnteTokenInvalido: false, body: { mfaChangeToken },
      }),
    mfaConfirmar: (mfaChangeToken: string, codigo: string) =>
      cliente.request<void>('/auth/mfa/cambios/confirmar', {
        method: 'POST', version: 'v2', renovarAnteTokenInvalido: false, body: { mfaChangeToken, codigo },
      }),
    login: (correo: string, contrasena: string) =>
      cliente.request<SesionIniciada | DesafioMfa>('/auth/login', {
        method: 'POST',
        body: { correo, contrasena },
        autenticada: false,
      }),
    logout: (refreshToken: string) =>
      cliente.request<void>('/auth/logout', { method: 'POST', body: { refreshToken }, autenticada: false }),
    otpSolicitar: (challengeToken: string) =>
      cliente.request<OtpEnviado>('/auth/otp/solicitar', {
        method: 'POST',
        body: { challengeToken, canal: 'EMAIL' },
        autenticada: false,
      }),
    otpVerificar: (challengeToken: string, codigo: string) =>
      cliente.request<SesionIniciada>('/auth/otp/verificar', {
        method: 'POST',
        body: { challengeToken, codigo },
        autenticada: false,
      }),
    desbloquear: (token: string) =>
      cliente.request<void>('/auth/desbloquear', { method: 'POST', body: { token }, autenticada: false }),
    cambiarContrasena: (contrasenaActual: string, nuevaContrasena: string) =>
      cliente.request<void>('/password/cambiar', { method: 'POST', body: { contrasenaActual, nuevaContrasena } }),
    actividadPropia: (pagina: number, signal?: AbortSignal) =>
      cliente.request<PaginaActividad>(`/auth/me/actividad?pagina=${pagina}&tamano=20`, { signal }),
    actualizarPerfilPropio: (id: string, cambios: { nombres?: string; apellidos?: string; celular?: string }) =>
      cliente.request<Usuario>(`/usuarios/${encodeURIComponent(id)}/atributos`, { method: 'PATCH', body: cambios }),
    perfilPropio: (signal?: AbortSignal) => cliente.request<Usuario>('/auth/me', { signal }),
    politicaPassword: (signal?: AbortSignal) =>
      cliente.request<PoliticaPassword>('/password/politica', { autenticada: false, signal }),
    listarUsuarios: (filtros: FiltrosUsuarios, signal?: AbortSignal) => {
      const q = new URLSearchParams()
      for (const [clave, valor] of Object.entries(filtros)) {
        if (valor !== undefined && valor !== '') q.set(clave, String(valor))
      }
      const consulta = q.toString()
      return cliente.request<PaginaUsuarios>(`/usuarios${consulta ? `?${consulta}` : ''}`, { signal })
    },
    obtenerUsuario: (id: string, signal?: AbortSignal) =>
      cliente.request<Usuario>(`/usuarios/${encodeURIComponent(id)}`, { signal }),
    asignarRol: (id: string, rol: CodigoRol) =>
      cliente.request<Usuario>(`/usuarios/${encodeURIComponent(id)}/roles`, { method: 'POST', body: { rol } }),
    revocarRol: (id: string, rol: CodigoRol) =>
      cliente.request<void>(`/usuarios/${encodeURIComponent(id)}/roles/${encodeURIComponent(rol)}`, {
        method: 'DELETE',
      }),
  }
}

export type Api = ReturnType<typeof crearApi>
export const api: Api = crearApi(http)
