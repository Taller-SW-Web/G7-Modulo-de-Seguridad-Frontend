// Validaciones de cliente de la edición propia (AtributosUsuario).
export type Campos = { nombres: string; apellidos: string; celular: string }

export function validarPerfil(c: Campos): Partial<Record<keyof Campos, string>> {
  const e: Partial<Record<keyof Campos, string>> = {}
  if (!c.nombres.trim()) e.nombres = 'Escribe tus nombres.'
  else if (c.nombres.trim().length > 100) e.nombres = 'Máximo 100 caracteres.'
  if (!c.apellidos.trim()) e.apellidos = 'Escribe tus apellidos.'
  else if (c.apellidos.trim().length > 100) e.apellidos = 'Máximo 100 caracteres.'
  if (c.celular.trim() && !/^\+51[0-9]{9}$/.test(c.celular.trim())) e.celular = 'Escribe el celular como +51 y 9 dígitos.'
  return e
}
