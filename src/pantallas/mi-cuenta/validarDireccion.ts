// Validaciones de cliente del alta de dirección (FRONT-06, DireccionRequest del backend).
export type CamposDireccion = {
  etiqueta: string
  departamento: string
  provincia: string
  distrito: string
  direccion: string
  referencia: string
  esPredeterminada: boolean
}

export type ErroresDireccion = Partial<Record<Exclude<keyof CamposDireccion, 'esPredeterminada'>, string>>

const OBLIGATORIO = 'Este campo es obligatorio.'

const MAXIMOS = { etiqueta: 50, departamento: 100, provincia: 100, distrito: 100, direccion: 255, referencia: 255 } as const

export function validarDireccion(c: CamposDireccion): ErroresDireccion {
  const e: ErroresDireccion = {}
  for (const clave of ['departamento', 'provincia', 'distrito', 'direccion'] as const) {
    if (!c[clave].trim()) e[clave] = OBLIGATORIO
  }
  for (const clave of Object.keys(MAXIMOS) as (keyof typeof MAXIMOS)[]) {
    if (!e[clave] && c[clave].trim().length > MAXIMOS[clave]) e[clave] = `Máximo ${MAXIMOS[clave]} caracteres.`
  }
  return e
}
