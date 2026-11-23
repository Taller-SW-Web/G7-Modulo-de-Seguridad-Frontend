import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderizar } from '../../test/renderizar'

describe('Términos de uso 2026-11-v1 (H-12)', () => {
  it('se ven sin sesión, con su versión y sus ocho puntos', async () => {
    renderizar({}, '/terminos')
    expect(await screen.findByRole('heading', { name: 'Términos de uso' })).toBeTruthy()
    expect(screen.getByText(/Versión 2026-11-v1/)).toBeTruthy()
    expect(screen.getByText('1. Qué es esta plataforma.')).toBeTruthy()
    expect(screen.getByText('8. Cambios.')).toBeTruthy()
  })

  it('el registro también enlaza a los términos', async () => {
    renderizar({ politicaPassword: () => new Promise(() => {}) }, '/registro')
    expect((await screen.findByRole('link', { name: 'términos y condiciones' })).getAttribute('href')).toBe('/terminos')
  })
})
