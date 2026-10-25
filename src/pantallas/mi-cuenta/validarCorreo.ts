// Validaciones de cliente del cambio de correo (FRONT-06, esquema de /usuarios/{id}/correo).
// El backend vuelve a validar; la contraseña no se recorta porque los espacios pueden formar parte de ella.
export type CamposCorreo = { nuevoCorreo: string; contrasenaActual: string }

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validarCorreo(campos: CamposCorreo, correoActual: string): Partial<Record<keyof CamposCorreo, string>> {
  const errores: Partial<Record<keyof CamposCorreo, string>> = {}
  const nuevo = campos.nuevoCorreo.trim()
  if (!nuevo || nuevo.length > 254 || !FORMATO_CORREO.test(nuevo)) errores.nuevoCorreo = 'Escribe un correo válido.'
  else if (nuevo.toLowerCase() === correoActual.trim().toLowerCase()) errores.nuevoCorreo = 'Es el mismo correo que ya usas.'
  if (!campos.contrasenaActual) errores.contrasenaActual = 'Escribe tu contraseña actual.'
  return errores
}
