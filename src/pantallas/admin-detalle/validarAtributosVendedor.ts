// FEAT-04-T6 — reglas de AtributosUsuario para vendedor (OpenAPI) y la de FRONT-08 para la fecha.
export type CamposVendedor = { codigoVendedor: string; tienda: string; fechaIngreso: string }

export const MENSAJE_FECHA = 'Escribe una fecha válida.'

/** `AAAA-MM-DD` que además existe en el calendario (rechaza 2026-02-30). */
export function esFechaValida(texto: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false
  const [a, m, d] = texto.split('-').map(Number)
  const fecha = new Date(Date.UTC(a, m - 1, d))
  return fecha.getUTCFullYear() === a && fecha.getUTCMonth() === m - 1 && fecha.getUTCDate() === d
}

export function validarAtributosVendedor(c: CamposVendedor): Partial<Record<keyof CamposVendedor, string>> {
  const errores: Partial<Record<keyof CamposVendedor, string>> = {}
  if (c.codigoVendedor.trim().length > 50) errores.codigoVendedor = 'Máximo 50 caracteres.'
  if (c.tienda.trim().length > 100) errores.tienda = 'Máximo 100 caracteres.'
  const fecha = c.fechaIngreso.trim()
  if (fecha && !esFechaValida(fecha)) errores.fechaIngreso = MENSAJE_FECHA
  return errores
}
