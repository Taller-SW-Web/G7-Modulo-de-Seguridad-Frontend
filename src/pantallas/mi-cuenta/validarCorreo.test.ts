import { describe, expect, it } from 'vitest'
import { validarCorreo } from './validarCorreo'

const ACTUAL = 'ana@g7.test'

describe('validarCorreo (FRONT-06)', () => {
  it('acepta un correo nuevo válido con contraseña', () => {
    expect(validarCorreo({ nuevoCorreo: 'nuevo@g7.test', contrasenaActual: 'x' }, ACTUAL)).toEqual({})
  })

  it.each(['', '   ', 'sin-arroba', 'a@b', 'a b@c.com', '@g7.test'])('rechaza el formato %j', (valor) => {
    expect(validarCorreo({ nuevoCorreo: valor, contrasenaActual: 'x' }, ACTUAL).nuevoCorreo).toBe('Escribe un correo válido.')
  })

  it('rechaza un correo de más de 254 caracteres', () => {
    const largo = `${'a'.repeat(250)}@g7.test`
    expect(validarCorreo({ nuevoCorreo: largo, contrasenaActual: 'x' }, ACTUAL).nuevoCorreo).toBe('Escribe un correo válido.')
  })

  it('rechaza el mismo correo sin distinguir mayúsculas ni espacios', () => {
    expect(validarCorreo({ nuevoCorreo: '  ANA@G7.test ', contrasenaActual: 'x' }, ACTUAL).nuevoCorreo).toBe(
      'Es el mismo correo que ya usas.',
    )
  })

  it('exige la contraseña actual y no la recorta', () => {
    expect(validarCorreo({ nuevoCorreo: 'nuevo@g7.test', contrasenaActual: '' }, ACTUAL).contrasenaActual).toBe(
      'Escribe tu contraseña actual.',
    )
    expect(validarCorreo({ nuevoCorreo: 'nuevo@g7.test', contrasenaActual: '  ' }, ACTUAL).contrasenaActual).toBeUndefined()
  })
})
