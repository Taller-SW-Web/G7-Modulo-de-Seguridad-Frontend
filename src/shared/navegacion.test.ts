import { describe, expect, it } from 'vitest'
import { leerClaims } from './jwt'
import { destinoPorDefecto, volverSeguro } from './navegacion'

describe('navegación', () => {
  it('volver solo acepta rutas internas relativas', () => {
    expect(volverSeguro('/admin/usuarios?pagina=2')).toBe('/admin/usuarios?pagina=2')
    for (const peligrosa of ['//evil.test', '/\\evil.test', 'https://evil.test', 'javascript:alert(1)', '', null, '/a\nb'])
      expect(volverSeguro(peligrosa)).toBeNull()
  })

  it('el destino por defecto es administración solo con usuario.ver', () => {
    expect(destinoPorDefecto(['usuario.ver', 'rol.asignar'])).toBe('/admin/usuarios')
    expect(destinoPorDefecto([])).toBe('/mi-cuenta')
  })

  it('lee permisos del token sin verificar y tolera tokens malformados', () => {
    const carga = btoa(JSON.stringify({ permisos: ['usuario.ver', 3], exp: 10 })).replace(/=+$/, '')
    expect(leerClaims(`h.${carga}.f`)).toEqual({ permisos: ['usuario.ver'], exp: 10 })
    expect(leerClaims('basura')).toEqual({ permisos: [], exp: null })
  })
})
