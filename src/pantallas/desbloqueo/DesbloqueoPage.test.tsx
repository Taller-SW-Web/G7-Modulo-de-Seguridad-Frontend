import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/errores'
import { renderizar } from '../../test/renderizar'

function abrirCon(url: string) {
  window.history.replaceState(null, '', url)
}

describe('FRONT-12 desbloqueo con enlace', () => {
  beforeEach(() => abrirCon('/'))

  it('quita el token de la URL al cargar y no lo consume hasta pulsar el botón', async () => {
    abrirCon('/desbloquear?token=secreto-del-correo')
    const desbloquear = vi.fn().mockResolvedValue(undefined)
    renderizar({ desbloquear }, '/desbloquear')

    expect(window.location.href).not.toContain('secreto-del-correo')
    expect(desbloquear).not.toHaveBeenCalled()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Desbloquear mi cuenta' }))
    expect(desbloquear).toHaveBeenCalledWith('secreto-del-correo')
    expect(await screen.findByText(/Tu cuenta está desbloqueada/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toBeTruthy()
  })

  it('enlace vencido o ya usado muestran su mensaje y el canal de soporte', async () => {
    abrirCon('/desbloquear?token=t1')
    const desbloquear = vi.fn().mockRejectedValue(new ApiError(410, { code: 'TOKEN_DESBLOQUEO_EXPIRADO' }, null))
    renderizar({ desbloquear }, '/desbloquear')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Desbloquear mi cuenta' }))
    expect(await screen.findByText(/los enlaces de desbloqueo duran 30 minutos/)).toBeTruthy()
  })

  it('enlace no válido', async () => {
    abrirCon('/desbloquear?token=t2')
    const desbloquear = vi.fn().mockRejectedValue(new ApiError(401, { code: 'TOKEN_DESBLOQUEO_INVALIDO' }, null))
    renderizar({ desbloquear }, '/desbloquear')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Desbloquear mi cuenta' }))
    expect(await screen.findByText(/puede que ya se haya usado/)).toBeTruthy()
  })

  it('sin token muestra enlace incompleto sin llamar al backend', async () => {
    abrirCon('/desbloquear')
    const desbloquear = vi.fn()
    renderizar({ desbloquear }, '/desbloquear')
    expect(await screen.findByText('Enlace incompleto')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Desbloquear mi cuenta' })).toBeNull()
    expect(desbloquear).not.toHaveBeenCalled()
  })

  it('servicio caído deja reintentar', async () => {
    abrirCon('/desbloquear?token=t3')
    const desbloquear = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(503, { code: 'NO_DISPONIBLE' }, null))
      .mockResolvedValueOnce(undefined)
    renderizar({ desbloquear }, '/desbloquear')
    const u = userEvent.setup()
    await u.click(screen.getByRole('button', { name: 'Desbloquear mi cuenta' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    await u.click(screen.getByRole('button', { name: 'Desbloquear mi cuenta' }))
    expect(await screen.findByText(/Tu cuenta está desbloqueada/)).toBeTruthy()
  })
})
