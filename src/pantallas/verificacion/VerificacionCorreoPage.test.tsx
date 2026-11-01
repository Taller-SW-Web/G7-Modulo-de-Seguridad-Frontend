import { MantineProvider } from '@mantine/core'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { BrowserRouter, MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Rutas } from '../../App'
import { crearAlmacenSesion } from '../../shared/almacenSesion'
import type { Api } from '../../shared/api'
import { ApiError, RedError } from '../../shared/errores'
import { ProveedorSesion } from '../../shared/sesion'
import { tema } from '../../shared/tema'
import { renderizar, sesionDe } from '../../test/renderizar'

const G1 = 'https://g1-marketplace-frontend.vercel.app/login'

/** Monta con el navegador real (jsdom) para comprobar que la URL pierde el token y el canal. */
function abrirEnlace(api: Partial<Api>, url: string, almacen = crearAlmacenSesion()) {
  window.history.replaceState(null, '', url)
  render(
    <StrictMode>
      <MantineProvider theme={tema}>
        <ProveedorSesion almacen={almacen} api={api as Api}>
          <BrowserRouter><Rutas api={api as Api} /></BrowserRouter>
        </ProveedorSesion>
      </MantineProvider>
    </StrictMode>,
  )
}

afterEach(() => {
  vi.unstubAllEnvs()
  window.history.replaceState(null, '', '/')
})

describe('FEAT-01-T5 FRONT-03 verificación de correo', () => {
  it('UI-03.1 tras el registro muestra el correo enmascarado y reenvía a ese correo', async () => {
    const reenviarVerificacion = vi.fn().mockResolvedValue(undefined)
    render(
      <MantineProvider theme={tema}>
        <ProveedorSesion almacen={crearAlmacenSesion()} api={{ reenviarVerificacion } as unknown as Api}>
          <MemoryRouter initialEntries={[{ pathname: '/verificar-correo', state: { correo: 'maria@ejemplo.com' } }]}>
            <Rutas api={{ reenviarVerificacion } as unknown as Api} />
          </MemoryRouter>
        </ProveedorSesion>
      </MantineProvider>,
    )
    expect(screen.getByText('m***a@ejemplo.com')).toBeTruthy()
    expect(screen.getByText(/Vence en 24 horas/)).toBeTruthy()
    expect(screen.queryByLabelText(/^Correo/)).toBeNull()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Reenviar enlace' }))
    expect(await screen.findByRole('status')).toBeTruthy()
    expect(reenviarVerificacion).toHaveBeenCalledWith('maria@ejemplo.com')
  })

  it('UI-03.7 sin correo en memoria (enlace de FRONT-01 o recarga) pide el correo', () => {
    renderizar({}, '/verificar-correo')
    expect((screen.getByLabelText(/^Correo/) as HTMLInputElement).value).toBe('')
    expect(screen.getByRole('button', { name: 'Enviar un enlace nuevo' })).toBeTruthy()
  })

  it('UI-03.2 verifica una sola vez aunque React monte dos veces, y quita token y canal de la URL', async () => {
    const verificarCorreo = vi.fn().mockResolvedValue(undefined)
    abrirEnlace({ verificarCorreo }, '/verificar-correo?token=secreto-de-prueba')

    expect(await screen.findByText('Tu correo quedó verificado.')).toBeTruthy()
    expect(verificarCorreo).toHaveBeenCalledTimes(1)
    expect(verificarCorreo).toHaveBeenCalledWith('secreto-de-prueba')
    expect(window.location.search).toBe('')
    expect(window.location.href).not.toContain('secreto-de-prueba')
    expect(screen.getByRole('link', { name: 'Iniciar sesión' }).getAttribute('href')).toBe('/login')
  })

  it('UI-03.2 «Iniciar sesión» lleva a FRONT-01 con el aviso de verificación', async () => {
    abrirEnlace({ verificarCorreo: vi.fn().mockResolvedValue(undefined) }, '/verificar-correo?token=t')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('link', { name: 'Iniciar sesión' }))
    expect(await screen.findByText('Tu correo quedó verificado. Ya puedes iniciar sesión.')).toBeTruthy()
  })

  it('UI-03.3 enlace vencido: explicación y formulario de reenvío, sin datos de la cuenta', async () => {
    const verificarCorreo = vi.fn().mockRejectedValue(new ApiError(410, { code: 'ENLACE_EXPIRADO' }, null))
    abrirEnlace({ verificarCorreo }, '/verificar-correo?token=t')
    expect(await screen.findByText(/Este enlace venció: los enlaces de verificación duran 24 horas/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Enviar un enlace nuevo' })).toBeTruthy()
  })

  it('enlace incompleto: como vencido y sin llamar al backend', async () => {
    const verificarCorreo = vi.fn()
    abrirEnlace({ verificarCorreo }, '/verificar-correo?token=')
    expect(await screen.findByText(/Este enlace venció/)).toBeTruthy()
    expect(verificarCorreo).not.toHaveBeenCalled()
  })

  it('UI-03.4 el 202 del reenvío muestra el mismo mensaje condicional para cualquier correo', async () => {
    const reenviarVerificacion = vi.fn().mockResolvedValue(undefined)
    renderizar({ reenviarVerificacion }, '/verificar-correo')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/^Correo/), ' nadie@ejemplo.com ')
    await user.click(screen.getByRole('button', { name: 'Enviar un enlace nuevo' }))
    expect((await screen.findByRole('status')).textContent).toBe(
      'Si hay una cuenta pendiente de verificar con ese correo, te enviamos un enlace nuevo. El anterior deja de funcionar.')
    expect(reenviarVerificacion).toHaveBeenCalledWith('nadie@ejemplo.com')
    expect((screen.getByRole('button', { name: 'Enviar un enlace nuevo' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('UI-03.5 el 429 muestra su mensaje y deshabilita el botón', async () => {
    const reenviarVerificacion = vi.fn().mockRejectedValue(new ApiError(429, { code: 'DEMASIADAS_SOLICITUDES' }, 1800))
    renderizar({ reenviarVerificacion }, '/verificar-correo')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/^Correo/), 'maria@ejemplo.com')
    await user.click(screen.getByRole('button', { name: 'Enviar un enlace nuevo' }))
    expect(await screen.findByText('Ya pediste varios enlaces en la última hora. Espera un rato antes de pedir otro.')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Enviar un enlace nuevo' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('UI-03.6 enlace ya usado (o desconocido): explicación, iniciar sesión y reenvío', async () => {
    const verificarCorreo = vi.fn().mockRejectedValue(new ApiError(410, { code: 'ENLACE_YA_USADO' }, null))
    abrirEnlace({ verificarCorreo }, '/verificar-correo?token=t')
    expect(await screen.findByText('Este enlace ya se usó. Si ya verificaste tu correo, puedes iniciar sesión.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Enviar un enlace nuevo' })).toBeTruthy()
  })

  it('UI-03.8 desde Marketplace «Iniciar sesión» va al login de G1 sin token ni correo', async () => {
    vi.stubEnv('VITE_RETORNO_MARKETPLACE', G1)
    abrirEnlace({ verificarCorreo: vi.fn().mockResolvedValue(undefined) }, '/verificar-correo?token=t-1&canal=MARKETPLACE')

    const boton = await screen.findByRole('link', { name: 'Iniciar sesión' })
    expect(boton.getAttribute('href')).toBe(G1)
    expect(boton.getAttribute('rel')).toContain('noreferrer')
    expect(window.location.search).toBe('')
  })

  it('UI-03.9 un canal manipulado nunca lleva a una URL recibida en el enlace', async () => {
    vi.stubEnv('VITE_RETORNO_MARKETPLACE', G1)
    abrirEnlace({ verificarCorreo: vi.fn().mockResolvedValue(undefined) },
      `/verificar-correo?token=t&canal=${encodeURIComponent('https://otro-sitio.example')}`)
    expect((await screen.findByRole('link', { name: 'Iniciar sesión' })).getAttribute('href')).toBe('/login')
  })

  it('MARKETPLACE sin URL configurada usa nuestro login', async () => {
    vi.stubEnv('VITE_RETORNO_MARKETPLACE', '')
    abrirEnlace({ verificarCorreo: vi.fn().mockResolvedValue(undefined) }, '/verificar-correo?token=t&canal=MARKETPLACE')
    expect((await screen.findByRole('link', { name: 'Iniciar sesión' })).getAttribute('href')).toBe('/login')
  })

  it('con sesión abierta, tras verificar ofrece ir a Mi cuenta', async () => {
    const almacen = crearAlmacenSesion()
    almacen.aceptar(sesionDe([]))
    abrirEnlace({ verificarCorreo: vi.fn().mockResolvedValue(undefined) }, '/verificar-correo?token=t', almacen)
    expect((await screen.findByRole('link', { name: 'Ir a Mi cuenta' })).getAttribute('href')).toBe('/mi-cuenta')
  })

  it('sin conexión muestra el mensaje común y permite reintentar con el mismo enlace', async () => {
    const verificarCorreo = vi.fn().mockRejectedValueOnce(new RedError()).mockResolvedValueOnce(undefined)
    abrirEnlace({ verificarCorreo }, '/verificar-correo?token=t')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Intentar de nuevo' }))
    expect(await screen.findByText('Tu correo quedó verificado.')).toBeTruthy()
    await waitFor(() => expect(verificarCorreo).toHaveBeenCalledTimes(2))
  })

  it('el login ofrece el reenvío de verificación', async () => {
    renderizar({}, '/login')
    const user = userEvent.setup()
    await user.click(screen.getByRole('link', { name: '¿No te llegó el correo de verificación?' }))
    expect(await screen.findByRole('button', { name: 'Enviar un enlace nuevo' })).toBeTruthy()
  })
})
