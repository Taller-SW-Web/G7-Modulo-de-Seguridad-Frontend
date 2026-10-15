// Etiquetas canónicas (catálogo R__catalogo_autorizacion / FRONT-00 §4) y textos de estado (FRONT-07).
import type { CodigoRol, EstadoCuenta, Usuario } from './tipos'

export const ETIQUETA_ROL: Record<CodigoRol, string> = {
  CLIENTE: 'Cliente',
  VENDEDOR: 'Vendedor',
  ADMIN_VENTAS: 'Administrador de ventas',
  GESTOR_DESPACHO: 'Gestor de despacho',
  GESTOR_COMERCIAL: 'Gestor comercial',
  ADMIN_SISTEMA: 'Administrador del sistema',
}

export const ROLES_DE_GESTION: readonly CodigoRol[] = ['ADMIN_VENTAS', 'GESTOR_DESPACHO', 'GESTOR_COMERCIAL', 'ADMIN_SISTEMA']

export const ETIQUETA_ESTADO: Record<EstadoCuenta, string> = {
  ACTIVO: 'Activa',
  PENDIENTE_VERIFICACION: 'Pendiente de verificación',
  BLOQUEADO: 'Bloqueada',
  INACTIVO: 'Inactiva',
}

export const COLOR_ESTADO: Record<EstadoCuenta, string> = {
  ACTIVO: 'green',
  PENDIENTE_VERIFICACION: 'yellow',
  BLOQUEADO: 'red',
  INACTIVO: 'gray',
}

const hora = new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit' })
const fechaHora = new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' })

/** Texto del estado, siempre legible sin depender del color. */
export function textoEstado(usuario: Pick<Usuario, 'estado' | 'bloqueo'>): string {
  if (usuario.estado !== 'BLOQUEADO') return ETIQUETA_ESTADO[usuario.estado]
  const hasta = usuario.bloqueo?.hasta
  return hasta ? `Bloqueada hasta ${hora.format(new Date(hasta))}` : 'Bloqueada sin vencimiento'
}

export function textoVencimiento(hasta: string | null): string {
  return hasta ? `Hasta ${fechaHora.format(new Date(hasta))}` : 'Sin vencimiento'
}
