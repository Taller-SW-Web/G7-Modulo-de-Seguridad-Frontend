// Enmascarado del correo (FRONT-03): primera y última letra de la parte local y el dominio completo,
// con la misma forma que el contrato usa para el OTP.

export function enmascararCorreo(correo: string): string {
  const arroba = correo.lastIndexOf('@')
  if (arroba < 1) return correo
  const local = correo.slice(0, arroba)
  const dominio = correo.slice(arroba)
  if (local.length <= 2) return `${local[0]}*${dominio}`
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}${dominio}`
}
