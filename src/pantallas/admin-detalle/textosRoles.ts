// Textos de confirmación de SeccionRoles (FRONT-08 «Textos y mensajes»).
import { ETIQUETA_ROL, ROLES_DE_GESTION } from '../../shared/etiquetas'
import type { CodigoRol, Usuario } from '../../shared/tipos'

export type Cambio = { tipo: 'asignar' | 'revocar'; rol: CodigoRol }

export const MENSAJE_PROTEGIDO =
  'No puedes hacer esto con tu propia cuenta ni con el último administrador del sistema activo.'

export function textoConfirmacion(cambio: Cambio, usuario: Usuario): string[] {
  const etiqueta = ETIQUETA_ROL[cambio.rol]
  if (cambio.tipo === 'asignar') {
    const partes = [
      `¿Asignar el rol ${etiqueta} a ${usuario.correo}? Se cerrarán sus sesiones y tendrá que volver a iniciar sesión para usar el nuevo acceso.`,
    ]
    if (ROLES_DE_GESTION.includes(cambio.rol)) partes.push('Con este rol, el segundo factor será obligatorio para esta cuenta.')
    return partes
  }
  const partes = [`¿Quitar el rol ${etiqueta} a ${usuario.correo}? Se cerrarán sus sesiones.`]
  if (usuario.roles.length === 1)
    partes.push('La cuenta quedará sin ningún rol y no podrá usar ninguna función protegida.')
  return partes
}

