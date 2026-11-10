// FEAT-16: la SPA pide el access cifrado en login, verificación de OTP y renovación,
// para que sus claims (roles, permisos, correo) no se lean en el tráfico del navegador.
// El backend lo descifra; los permisos llegan en `usuario.permisos` de la respuesta.
export const FORMATO_ACCESO = 'CIFRADO'
