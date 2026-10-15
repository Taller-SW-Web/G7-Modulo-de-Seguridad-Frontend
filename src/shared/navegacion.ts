// Destino por defecto (ENTORNO-Y-REACT §3) y `volver` seguro (FRONT-00 §1.4).

export const PERMISO_VER_USUARIOS = 'usuario.ver'
export const PERMISO_ASIGNAR_ROL = 'rol.asignar'

/** Administración si hay permiso; si no, Mi cuenta. */
export function destinoPorDefecto(permisos: readonly string[]): string {
  return permisos.includes(PERMISO_VER_USUARIOS) ? '/admin/usuarios' : '/mi-cuenta'
}

/** `volver` solo admite rutas internas relativas: empieza por `/` y no por `//` ni `/\`. */
export function volverSeguro(volver: string | null | undefined): string | null {
  if (!volver || !volver.startsWith('/') || volver.startsWith('//') || volver.startsWith('/\\')) return null
  for (let i = 0; i < volver.length; i++) {
    if (volver.charCodeAt(i) < 0x20) return null
  }
  return volver
}
