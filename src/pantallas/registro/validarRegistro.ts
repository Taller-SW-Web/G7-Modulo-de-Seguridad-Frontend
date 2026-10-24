// Validaciones del cliente de FRONT-02. Orientan antes de enviar; el backend es quien valida.

export type CampoRegistro =
  | 'nombres' | 'apellidos' | 'correo' | 'celular' | 'contrasena' | 'confirmacion' | 'aceptaTerminos'

export interface ValoresRegistro {
  nombres: string
  apellidos: string
  correo: string
  celular: string
  contrasena: string
  confirmacion: string
  aceptaTerminos: boolean
}

/** Orden del formulario: el foco va al primer campo con error. */
export const ORDEN_CAMPOS: readonly CampoRegistro[] =
  ['nombres', 'apellidos', 'correo', 'celular', 'contrasena', 'confirmacion', 'aceptaTerminos']

export const MENSAJES_REGISTRO = {
  nombres: 'Escribe tu nombre.',
  apellidos: 'Escribe tus apellidos.',
  correo: 'Escribe un correo válido, como nombre@dominio.com.',
  celular: 'Escribe los 9 dígitos de tu celular.',
  contrasena: 'Escribe una contraseña.',
  confirmacion: 'Las contraseñas no coinciden.',
  aceptaTerminos: 'Debes aceptar los términos y el tratamiento de tus datos personales para crear tu cuenta.',
  datosPersonales: 'No puede contener tu nombre, tu apellido ni tu correo.',
  correoNoDisponible:
    'No pudimos completar el registro con este correo. Si ya tienes una cuenta, puedes iniciar sesión o recuperar tu contraseña.',
} as const

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validarCampo(campo: CampoRegistro, v: ValoresRegistro): string | null {
  switch (campo) {
    case 'nombres':
      return v.nombres.trim() ? null : MENSAJES_REGISTRO.nombres
    case 'apellidos':
      return v.apellidos.trim() ? null : MENSAJES_REGISTRO.apellidos
    case 'correo':
      return CORREO_VALIDO.test(v.correo.trim()) ? null : MENSAJES_REGISTRO.correo
    case 'celular':
      return /^\d{9}$/.test(v.celular) ? null : MENSAJES_REGISTRO.celular
    case 'contrasena':
      return v.contrasena ? null : MENSAJES_REGISTRO.contrasena
    case 'confirmacion':
      return v.confirmacion === v.contrasena ? null : MENSAJES_REGISTRO.confirmacion
    case 'aceptaTerminos':
      return v.aceptaTerminos ? null : MENSAJES_REGISTRO.aceptaTerminos
  }
}

export function validarTodo(v: ValoresRegistro): Partial<Record<CampoRegistro, string>> {
  const errores: Partial<Record<CampoRegistro, string>> = {}
  for (const campo of ORDEN_CAMPOS) {
    const error = validarCampo(campo, v)
    if (error) errores[campo] = error
  }
  return errores
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

/**
 * Regla orientativa de datos personales (RF-07.3): nombres, apellidos (cada palabra de 3+ letras)
 * o la parte local del correo dentro de la contraseña. Solo informa; el backend decide.
 */
export function contieneDatosPersonales(v: ValoresRegistro): boolean {
  const clave = normalizar(v.contrasena)
  if (!clave) return false
  const local = v.correo.trim().split('@')[0] ?? ''
  const piezas = [...normalizar(`${v.nombres} ${v.apellidos}`).split(/\s+/), normalizar(local)]
  return piezas.some((pieza) => pieza.length >= 3 && clave.includes(pieza))
}

const MENSAJE_REGLA: Record<string, (esperado: unknown) => string> = {
  LONGITUD_MINIMA: (esperado) => `Debe tener al menos ${esperado ?? 'los'} caracteres.`,
  MAYUSCULA: () => 'Falta una letra mayúscula.',
  MINUSCULA: () => 'Falta una letra minúscula.',
  DIGITO: () => 'Falta un número.',
  CARACTER_ESPECIAL: () => 'Falta un carácter especial.',
  CONTRASENA_COMUN: () => 'Es una contraseña demasiado común. Elige otra.',
  DATOS_PERSONALES: () => MENSAJES_REGISTRO.datosPersonales,
  YA_UTILIZADA: () => 'Ya usaste esta contraseña hace poco. Elige una distinta.',
}

/** Mensajes de `422 POLITICA_INCUMPLIDA` (FRONT-00 §3), uno por regla. */
export function mensajesPolitica(errores: readonly { regla?: string; esperado?: unknown }[]): string[] {
  const mensajes = errores.map((e) =>
    (e.regla && MENSAJE_REGLA[e.regla]?.(e.esperado)) || 'La contraseña no cumple los requisitos.')
  return [...new Set(mensajes)]
}
