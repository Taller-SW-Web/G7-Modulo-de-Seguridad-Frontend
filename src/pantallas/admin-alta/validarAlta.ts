// Validaciones de cliente de FRONT-11 (CrearUsuarioRequest de OpenAPI v2): correo, nombres y apellidos
// obligatorios; el rol es opcional y nunca CLIENTE. El backend vuelve a validar todo.
import type { CodigoRol } from '../../shared/tipos'

export type CampoAlta = 'correo' | 'nombres' | 'apellidos' | 'rol'

export interface ValoresAlta {
  correo: string
  nombres: string
  apellidos: string
  /** '' = «Sin rol»: se omite en la petición. */
  rol: CodigoRol | ''
}

/** Los cinco roles elegibles del alta, en el orden del catálogo; CLIENTE usa su registro propio. */
export const ROLES_ALTA: readonly CodigoRol[] = ['VENDEDOR', 'ADMIN_VENTAS', 'GESTOR_DESPACHO', 'GESTOR_COMERCIAL', 'ADMIN_SISTEMA']

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validarAlta(v: ValoresAlta): Partial<Record<CampoAlta, string>> {
  const errores: Partial<Record<CampoAlta, string>> = {}
  const correo = v.correo.trim()
  if (!correo) errores.correo = 'Escribe el correo.'
  else if (correo.length > 254 || !CORREO_VALIDO.test(correo)) errores.correo = 'Escribe un correo válido.'
  for (const campo of ['nombres', 'apellidos'] as const) {
    const valor = v[campo].trim()
    if (!valor) errores[campo] = campo === 'nombres' ? 'Escribe los nombres.' : 'Escribe los apellidos.'
    else if (valor.length > 100) errores[campo] = 'Admite como máximo 100 caracteres.'
  }
  if (v.rol && !ROLES_ALTA.includes(v.rol)) errores.rol = 'Elige un rol de la lista.'
  return errores
}

/** Cuerpo de POST /api/v2/usuarios: «Sin rol» omite `rol` (no null ni roles[]). */
export function peticionAlta(v: ValoresAlta): { correo: string; nombres: string; apellidos: string; rol?: CodigoRol } {
  return {
    correo: v.correo.trim(),
    nombres: v.nombres.trim(),
    apellidos: v.apellidos.trim(),
    ...(v.rol ? { rol: v.rol } : {}),
  }
}
