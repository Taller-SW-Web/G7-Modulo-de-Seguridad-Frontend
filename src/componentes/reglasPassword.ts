// Reglas del medidor (FRONT-00 §3), construidas desde GET /password/politica y nunca fijas en el código.
import type { PoliticaPassword } from '../shared/tipos'

export type EstadoRegla = 'cumple' | 'no-cumple' | 'al-guardar'

export interface ReglaEvaluada {
  codigo: string
  texto: string
  estado: EstadoRegla
}

/** Códigos de regla del 422 POLITICA_INCUMPLIDA que marcan «No cumple». */
export function evaluarReglas(politica: PoliticaPassword, valor: string, rechazadas: ReadonlySet<string> = new Set()):
  ReglaEvaluada[] {
  const reglas: ReglaEvaluada[] = []
  const comprobar = (codigo: string, texto: string, cumple: boolean) =>
    reglas.push({ codigo, texto, estado: rechazadas.has(codigo) || !cumple ? 'no-cumple' : 'cumple' })
  comprobar('LONGITUD_MINIMA', `Al menos ${politica.longitudMinima} caracteres`, valor.length >= politica.longitudMinima)
  if (politica.requiereMayuscula) comprobar('MAYUSCULA', 'Una letra mayúscula', /\p{Lu}/u.test(valor))
  if (politica.requiereMinuscula) comprobar('MINUSCULA', 'Una letra minúscula', /\p{Ll}/u.test(valor))
  if (politica.requiereDigito) comprobar('DIGITO', 'Un número', /\d/.test(valor))
  if (politica.requiereCaracterEspecial)
    comprobar('CARACTER_ESPECIAL', 'Un carácter especial (por ejemplo ! # $ %)', /[^\p{L}\d\s]/u.test(valor))
  const alGuardar = (codigo: string, texto: string) =>
    reglas.push({ codigo, texto, estado: rechazadas.has(codigo) ? 'no-cumple' : 'al-guardar' })
  if (politica.rechazaComunes) alGuardar('CONTRASENA_COMUN', 'Que no sea una contraseña común')
  if (politica.rechazaDatosPersonales) alGuardar('DATOS_PERSONALES', 'Que no contenga tu nombre, apellido ni correo')
  if (politica.historial) alGuardar('YA_UTILIZADA', `Que no sea una de tus últimas ${politica.historial}`)
  return reglas
}
