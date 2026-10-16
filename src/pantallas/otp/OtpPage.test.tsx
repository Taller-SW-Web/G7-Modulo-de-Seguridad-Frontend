import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { descartarDesafio, guardarDesafio } from '../../shared/desafio'
import { ApiError } from '../../shared/errores'
import { renderizar, sesionDe } from '../../test/renderizar'

const enviado = { canal: 'EMAIL', destinoEnmascarado: 'a***n@g7.test', expiraEn: 300, desafioExpiraEn: 300 }

async function escribir(codigo: string) {
  const u = userEvent.setup()
  await u.click(screen.getByLabelText('Dígito 1 de 6'))
  await u.keyboard(codigo)
}

describe('FRONT-04 desafío OTP', () => {
  beforeEach(() => {
    descartarDesafio()
    guardarDesafio({ mfaRequerido: true, challengeToken: 'desafio-opaco', expiraEn: 300 })
  })

  it('sin desafío en memoria vuelve al login', async () => {
    descartarDesafio()
    renderizar({}, '/otp')
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeTruthy()
  })

  it('pide el código al abrir, verifica al completar 6 dígitos y abre la sesión del admin', async () => {
    const otpSolicitar = vi.fn().mockResolvedValue(enviado)
    const otpVerificar = vi.fn().mockResolvedValue(sesionDe(['usuario.ver'], ['ADMIN_SISTEMA']))
    const listarUsuarios = vi.fn().mockResolvedValue({ usuarios: [], pagina: 1, tamano: 20, total: 0 })
    const { almacen } = renderizar({ otpSolicitar, otpVerificar, listarUsuarios }, '/otp')

    expect(await screen.findByText('a***n@g7.test')).toBeTruthy()
    await escribir('482913')

    await waitFor(() => expect(otpVerificar).toHaveBeenCalledWith('desafio-opaco', '482913'))
    await waitFor(() => expect(almacen.estado().tipo).toBe('activa'))
    expect(await screen.findByRole('heading', { name: 'Usuarios' })).toBeTruthy()
  })

  it('código incorrecto muestra los intentos restantes y deja reintentar', async () => {
    const otpVerificar = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(401, { code: 'CODIGO_INVALIDO', intentosRestantes: 2 }, null))
    renderizar({ otpSolicitar: vi.fn().mockResolvedValue(enviado), otpVerificar }, '/otp')
    await screen.findByText('a***n@g7.test')
    await escribir('000000')
    expect((await screen.findByRole('alert')).textContent).toBe('El código no es correcto. Te quedan 2 intentos.')
    expect((screen.getByLabelText('Dígito 1 de 6') as HTMLInputElement).disabled).toBe(false)
  })

  it('intentos agotados bloquea las casillas y destaca pedir otro código', async () => {
    const otpSolicitar = vi.fn().mockResolvedValue(enviado)
    const otpVerificar = vi.fn().mockRejectedValue(new ApiError(401, { code: 'OTP_INTENTOS_AGOTADOS' }, null))
    renderizar({ otpSolicitar, otpVerificar }, '/otp')
    await screen.findByText('a***n@g7.test')
    await escribir('000000')
    expect((await screen.findByRole('alert')).textContent).toMatch(/Agotaste los intentos/)
    expect((screen.getByLabelText('Dígito 1 de 6') as HTMLInputElement).disabled).toBe(true)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Enviar otro código' }))
    expect(otpSolicitar).toHaveBeenCalledTimes(2)
  })

  it('429 al pedir otro código muestra la espera y deshabilita el reenvío', async () => {
    const otpSolicitar = vi
      .fn()
      .mockResolvedValueOnce(enviado)
      .mockRejectedValueOnce(new ApiError(429, { code: 'DEMASIADAS_SOLICITUDES' }, 120))
    renderizar({ otpSolicitar }, '/otp')
    await screen.findByText('a***n@g7.test')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Enviar otro código' }))
    expect((await screen.findByRole('status')).textContent).toMatch(/Espera antes de pedir otro/)
    expect((screen.getByRole('button', { name: 'Enviar otro código' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('desafío inválido vuelve al login con aviso y descarta el desafío', async () => {
    renderizar({ otpSolicitar: vi.fn().mockRejectedValue(new ApiError(401, { code: 'TOKEN_INVALIDO' }, null)) }, '/otp')
    expect(await screen.findByText('Tu verificación venció. Inicia sesión de nuevo.')).toBeTruthy()
    expect(window.location.href).not.toContain('desafio-opaco')
  })
})
