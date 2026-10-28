import { describe, expect, it } from 'vitest'
import { enmascararCorreo } from './enmascararCorreo'
import { canalDelEnlace, retornoDelCanal } from './retornoCanal'

const G1 = 'https://g1-marketplace-frontend.vercel.app/login'

describe('FEAT-01-T4 retorno por canal (FRONT-03)', () => {
  it('solo acepta canales de la lista cerrada; lo demás vale WEB', () => {
    expect(canalDelEnlace('MARKETPLACE')).toBe('MARKETPLACE')
    expect(canalDelEnlace('RETAIL')).toBe('RETAIL')
    expect(canalDelEnlace('CHATBOT')).toBe('CHATBOT')
    for (const otro of [null, '', 'marketplace', 'WEB ', 'https://otro-sitio.example', 'ADMIN']) {
      expect(canalDelEnlace(otro)).toBe('WEB')
    }
  })

  it('MARKETPLACE y RETAIL vuelven al mismo login de Marketplace; WEB y CHATBOT usan nuestro login', () => {
    const configuracion = { VITE_RETORNO_MARKETPLACE: G1 }
    expect(retornoDelCanal('MARKETPLACE', configuracion)).toBe(G1)
    expect(retornoDelCanal('RETAIL', configuracion)).toBe(G1)
    expect(retornoDelCanal('WEB', configuracion)).toBeNull()
    expect(retornoDelCanal('CHATBOT', configuracion)).toBeNull()
  })

  it('descarta URL vacías, relativas, sin https, con credenciales, parámetros o fragmento', () => {
    for (const valor of [undefined, '', '  ', '/login', 'javascript:alert(1)', 'http://g1.example/login',
      'https://user:pass@g1.example/login', 'https://g1.example/login?token=x', 'https://g1.example/login#a']) {
      expect(retornoDelCanal('MARKETPLACE', { VITE_RETORNO_MARKETPLACE: valor })).toBeNull()
    }
    expect(retornoDelCanal('MARKETPLACE', { VITE_RETORNO_MARKETPLACE: 'http://localhost:3000/login' }))
      .toBe('http://localhost:3000/login')
  })
})

describe('FRONT-03 enmascarado del correo', () => {
  it('deja la primera y la última letra de la parte local y el dominio completo', () => {
    expect(enmascararCorreo('maria@ejemplo.com')).toBe('m***a@ejemplo.com')
    expect(enmascararCorreo('ab@ejemplo.com')).toBe('a*@ejemplo.com')
    expect(enmascararCorreo('sin-arroba')).toBe('sin-arroba')
  })
})
