import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { crearAlmacenSesion } from '../../shared/almacenSesion'
import { ApiError } from '../../shared/errores'
import { renderizar, sesionDe } from '../../test/renderizar'

function conSesion() {
  const almacen = crearAlmacenSesion()
  almacen.aceptar(sesionDe([]))
  return almacen
}

describe('FRONT-06 Mi cuenta (lectura)', () => {
  it('muestra el perfil real de /auth/me, no el del token', async () => {
    const perfilPropio = vi.fn().mockResolvedValue({
      id: 'x', nombres: 'Ana', apellidos: 'Real', nombreCompleto: 'Ana Real', correo: 'ana.real@g7.test',
      estado: 'ACTIVO', correoVerificado: true, roles: ['CLIENTE', 'VENDEDOR'], mfaHabilitado: true,
    })
    renderizar({ perfilPropio, listarDirecciones: vi.fn().mockResolvedValue({ direcciones: [] }) }, '/mi-cuenta', conSesion())
    expect(await screen.findByText('Ana Real')).toBeTruthy()
    expect(screen.getByText('Vendedor')).toBeTruthy()
    expect(screen.getByText('Verificado')).toBeTruthy()
    expect(screen.getByText('Activo')).toBeTruthy()
  })

  it('si falla muestra el error y permite reintentar', async () => {
    const perfilPropio = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(503, { code: 'NO_DISPONIBLE' }, null))
      .mockResolvedValueOnce({ id: 'x', nombreCompleto: 'Ana', correo: 'a@g7.test', estado: 'ACTIVO', roles: [] })
    renderizar({ perfilPropio }, '/mi-cuenta', conSesion())
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Reintentar' }))
    expect((await screen.findAllByText('a@g7.test')).length).toBeGreaterThan(0)
  })
})
