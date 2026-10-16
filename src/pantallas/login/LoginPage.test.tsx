import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { crearAlmacenSesion } from '../../shared/almacenSesion'
import { ApiError } from '../../shared/errores'
import type { Usuario } from '../../shared/tipos'
import { renderizar, sesionDe } from '../../test/renderizar'

const perfilPropio = (): Promise<Usuario> => Promise.resolve({
  id: '00000000-0000-4000-8000-00000000f00a',
  nombreCompleto: 'Ana Prueba',
  correo: 'ana@g7.test',
  estado: 'ACTIVO',
  roles: ['CLIENTE'],
})

async function llenar(correo: string, contrasena: string) {
  const usuario = userEvent.setup()
  if (correo) await usuario.type(screen.getByLabelText(/correo/i), correo)
  if (contrasena) await usuario.type(screen.getByLabelText(/^contraseña/i), contrasena)
  await usuario.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
}

describe('FRONT-01 inicio de sesión', () => {
  it('valida los campos en el cliente sin llamar al backend', async () => {
    const login = vi.fn()
    renderizar({ login }, '/login')
    await llenar('no-es-correo', '')
    expect(screen.getByText('Escribe un correo válido, como nombre@dominio.com.')).toBeTruthy()
    expect(screen.getByText('Escribe tu contraseña.')).toBeTruthy()
    expect(login).not.toHaveBeenCalled()
  })

  it('credenciales inválidas: mensaje genérico, conserva el correo y borra la contraseña', async () => {
    const login = vi.fn().mockRejectedValue(new ApiError(401, { code: 'CREDENCIALES_INVALIDAS' }, null))
    renderizar({ login }, '/login')
    await llenar('ana@g7.test', 'Secreta-123!')
    expect((await screen.findByRole('alert')).textContent).toBe('El correo o la contraseña no son correctos.')
    expect((screen.getByLabelText(/correo/i) as HTMLInputElement).value).toBe('ana@g7.test')
    expect((screen.getByLabelText(/^contraseña/i) as HTMLInputElement).value).toBe('')
  })

  it('éxito: guarda la sesión en memoria y lleva al destino según permisos', async () => {
    const login = vi.fn().mockResolvedValue(sesionDe(['usuario.ver']))
    const { almacen } = renderizar({ login }, '/login')
    await llenar('ana@g7.test', 'Secreta-123!')
    await waitFor(() => expect(almacen.estado().tipo).toBe('activa'))
    expect(login).toHaveBeenCalledWith('ana@g7.test', 'Secreta-123!')
    expect(localStorage.length + sessionStorage.length).toBe(0)
  })

  it('cliente sin permisos llega a Mi cuenta', async () => {
    const login = vi.fn().mockResolvedValue(sesionDe([]))
    renderizar({ login, perfilPropio }, '/login')
    await llenar('ana@g7.test', 'Secreta-123!')
    expect(await screen.findByRole('heading', { name: 'Mi cuenta' })).toBeTruthy()
    expect((await screen.findAllByText('ana@g7.test')).length).toBeGreaterThan(0)
  })

  it('respeta volver interno y descarta uno externo', async () => {
    const login = vi.fn().mockResolvedValue(sesionDe([]))
    renderizar({ login, perfilPropio }, '/login?volver=%2F%2Fevil.test')
    await llenar('ana@g7.test', 'Secreta-123!')
    expect(await screen.findByRole('heading', { name: 'Mi cuenta' })).toBeTruthy()
  })

  it('desafío MFA: va a la pantalla OTP sin crear sesión ni poner el challengeToken en la URL', async () => {
    const login = vi.fn().mockResolvedValue({ mfaRequerido: true, challengeToken: 'desafio-secreto', expiraEn: 300 })
    const otpSolicitar = vi.fn().mockReturnValue(new Promise(() => {}))
    const { almacen } = renderizar({ login, otpSolicitar }, '/login')
    await llenar('ana@g7.test', 'Secreta-123!')
    expect(await screen.findByText('Enviando tu código…')).toBeTruthy()
    expect(otpSolicitar).toHaveBeenCalledWith('desafio-secreto')
    expect(almacen.estado().tipo).toBe('sin-sesion')
    expect(window.location.href).not.toContain('desafio-secreto')
  })

  it('sin sesión, una ruta protegida lleva al login recordando la ruta', async () => {
    renderizar({}, '/mi-cuenta')
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeTruthy()
  })

  it('cerrar sesión borra la sesión local aunque el logout falle', async () => {
    const almacen = crearAlmacenSesion()
    almacen.aceptar(sesionDe([]))
    const logout = vi.fn().mockRejectedValue(new TypeError('sin red'))
    renderizar({ logout, perfilPropio }, '/mi-cuenta', almacen)
    await userEvent.setup().click(await screen.findByRole('button', { name: /cerrar sesión/i }))
    expect(await screen.findByText('Cerraste sesión.')).toBeTruthy()
    expect(logout).toHaveBeenCalledWith('refresh-1')
    expect(almacen.tokens()).toBeNull()
  })
})
