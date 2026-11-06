import { render, screen, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Rutas } from '../../App'
import { crearAlmacenSesion, type AlmacenSesion } from '../../shared/almacenSesion'
import { ApiError, RedError } from '../../shared/errores'
import type { Api } from '../../shared/api'
import { ProveedorSesion } from '../../shared/sesion'
import type { PoliticaPassword } from '../../shared/tipos'
import { tema } from '../../shared/tema'
import { renderizar, sesionDe } from '../../test/renderizar'

const politica: PoliticaPassword = {
  longitudMinima: 10, requiereMayuscula: true, requiereMinuscula: true, requiereDigito: true,
  requiereCaracterEspecial: true, rechazaComunes: true, rechazaDatosPersonales: true, historial: 5,
}

afterEach(() => {
  window.history.replaceState(null, '', '/')
  vi.unstubAllEnvs()
})

function renderizarConNavegador(api: Partial<Api>, almacen: AlmacenSesion = crearAlmacenSesion()) {
  render(
    <MantineProvider theme={tema}>
      <ProveedorSesion almacen={almacen} api={api as Api}>
        <BrowserRouter><Rutas api={api as Api} /></BrowserRouter>
      </ProveedorSesion>
    </MantineProvider>,
  )
}

describe('FEAT-03-T4 FRONT-05 recuperar contraseña', () => {
  it('ofrece recuperar desde login y mantiene la neutralidad tras el 202', async () => {
    const solicitarRecuperacion = vi.fn().mockResolvedValue(undefined)
    renderizar({ solicitarRecuperacion }, '/login')
    const user = userEvent.setup()
    await user.click(screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' }))
    await user.type(screen.getByLabelText(/^Correo/), 'persona@g7.test')
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }))
    expect((await screen.findByRole('status')).textContent).toContain(
      'Si el correo persona@g7.test corresponde a una cuenta, te enviamos un enlace',
    )
    expect(screen.getByRole('status').textContent).toContain('Vence en 30 minutos')
    expect(solicitarRecuperacion).toHaveBeenCalledWith('persona@g7.test')
  })

  it('lee el token de la URL y lo retira mediante reemplazo del historial', async () => {
    window.history.replaceState(null, '', '/recuperar-contrasena?token=secreto-de-prueba')
    renderizarConNavegador({ politicaPassword: vi.fn().mockResolvedValue(politica) })
    await screen.findByText(/Al menos 10 caracteres/)
    expect(window.location.search).toBe('')
    expect(window.location.href).not.toContain('secreto-de-prueba')
  })

  it('conserva el retorno MARKETPLACE antes y después de enviar el enlace y limpia el canal', async () => {
    vi.stubEnv('VITE_RETORNO_MARKETPLACE', 'https://g1-marketplace-frontend.vercel.app/login')
    const solicitarRecuperacion = vi.fn().mockResolvedValue(undefined)
    window.history.replaceState(null, '', '/recuperar-contrasena?canal=MARKETPLACE')
    renderizarConNavegador({ solicitarRecuperacion })
    expect(screen.getByRole('link', { name: 'Volver a iniciar sesión' }).getAttribute('href'))
      .toBe('https://g1-marketplace-frontend.vercel.app/login')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/^Correo/), 'persona@g7.test')
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }))

    await screen.findByRole('status')
    expect(solicitarRecuperacion).toHaveBeenCalledWith('persona@g7.test', 'MARKETPLACE')
    expect(window.location.search).toBe('')
    expect(screen.getByRole('link', { name: 'Volver a iniciar sesión' }).getAttribute('href'))
      .toBe('https://g1-marketplace-frontend.vercel.app/login')
  })

  it.each([
    { canal: 'WEB', retorno: 'https://g1-marketplace-frontend.vercel.app/login' },
    { canal: 'https://otro-sitio.example', retorno: 'https://g1-marketplace-frontend.vercel.app/login' },
    { canal: 'MARKETPLACE', retorno: '' },
    { canal: 'MARKETPLACE', retorno: 'http://otro-sitio.example/login' },
  ])('mantiene el login propio tras enviar para canal=$canal y retorno=$retorno', async ({ canal, retorno }) => {
    vi.stubEnv('VITE_RETORNO_MARKETPLACE', retorno)
    window.history.replaceState(null, '', '/recuperar-contrasena?canal=' + encodeURIComponent(canal))
    renderizarConNavegador({ solicitarRecuperacion: vi.fn().mockResolvedValue(undefined) })
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/^Correo/), 'persona@g7.test')
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }))
    await screen.findByRole('status')
    expect(screen.getByRole('link', { name: 'Volver a iniciar sesión' }).getAttribute('href')).toBe('/login')
    expect(window.location.search).toBe('')
    await user.click(screen.getByRole('link', { name: 'Volver a iniciar sesión' }))
    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeTruthy()
  })

  it('precarga el correo y enfoca Enviar enlace al llegar por contraseña caducada', async () => {
    const login = vi.fn().mockRejectedValue(new ApiError(401, { code: 'PASSWORD_CADUCADA' }, null))
    renderizar({ login }, '/login')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/^Correo/), 'admin@g7.test')
    await user.type(screen.getByLabelText(/^Contraseña/), 'Caducada-2026!')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    await user.click(await screen.findByRole('link', { name: 'Restablecer mi contraseña' }))
    expect((screen.getByLabelText(/^Correo/) as HTMLInputElement).value).toBe('admin@g7.test')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Enviar enlace' }))
  })

  it('bloquea nuevos envíos tras recibir 429', async () => {
    const solicitarRecuperacion = vi.fn().mockRejectedValue(new ApiError(429, { code: 'DEMASIADAS_SOLICITUDES' }, null))
    renderizar({ solicitarRecuperacion }, '/recuperar-contrasena', crearAlmacenSesion())
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/^Correo/), 'admin@g7.test')
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }))
    expect(await screen.findByText('Ya pediste varios enlaces seguidos. Espera unos minutos antes de pedir otro.')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Enviar enlace' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('503 muestra el mensaje común y permite reintentar', async () => {
    const solicitarRecuperacion = vi.fn()
      .mockRejectedValueOnce(new ApiError(503, { code: 'NO_DISPONIBLE' }, null))
      .mockResolvedValueOnce(undefined)
    renderizar({ solicitarRecuperacion }, '/recuperar-contrasena')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/^Correo/), 'persona@g7.test')
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }))
    expect(await screen.findByText('El servicio no está disponible en este momento. Intenta de nuevo en unos minutos.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }))
    expect(await screen.findByRole('status')).toBeTruthy()
    expect(solicitarRecuperacion).toHaveBeenCalledTimes(2)
  })

  it('una caída de red muestra el mensaje común y solo reenvía al reintentar', async () => {
    const solicitarRecuperacion = vi.fn()
      .mockRejectedValueOnce(new RedError())
      .mockResolvedValueOnce(undefined)
    renderizar({ solicitarRecuperacion }, '/recuperar-contrasena')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/^Correo/), 'persona@g7.test')
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }))
    expect(await screen.findByText('No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.')).toBeTruthy()
    expect(solicitarRecuperacion).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }))
    expect(await screen.findByRole('status')).toBeTruthy()
    expect(solicitarRecuperacion).toHaveBeenCalledTimes(2)
  })

  it('valida repetir contraseña y no envía el campo de confirmación', async () => {
    const restablecerContrasena = vi.fn().mockResolvedValue(undefined)
    renderizar({ politicaPassword: vi.fn().mockResolvedValue(politica), restablecerContrasena }, '/recuperar-contrasena?token=secreto')
    await screen.findByText(/Al menos 10 caracteres/)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/^Contraseña nueva/), 'Nueva-Segura-2026!')
    await user.type(screen.getByLabelText(/^Repite la contraseña/), 'Otra-Segura-2026!')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeTruthy()
    expect(restablecerContrasena).not.toHaveBeenCalled()
    await user.clear(screen.getByLabelText(/^Repite la contraseña/))
    await user.type(screen.getByLabelText(/^Repite la contraseña/), 'Nueva-Segura-2026!')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    await waitFor(() => expect(restablecerContrasena).toHaveBeenCalledWith('secreto', 'Nueva-Segura-2026!'))
    expect(restablecerContrasena.mock.calls[0]).toHaveLength(2)
  })

  it('oculta el formulario ante token expirado y permite pedir otro', async () => {
    const restablecerContrasena = vi.fn().mockRejectedValue(
      new ApiError(410, { code: 'TOKEN_RECUPERACION_EXPIRADO' }, null),
    )
    renderizar({ politicaPassword: vi.fn().mockResolvedValue(politica), restablecerContrasena }, '/recuperar-contrasena?token=vencido')
    await screen.findByText(/Al menos 10 caracteres/)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/^Contraseña nueva/), 'Nueva-Segura-2026!')
    await user.type(screen.getByLabelText(/^Repite la contraseña/), 'Nueva-Segura-2026!')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    expect(await screen.findByText('Este enlace venció: los enlaces para restablecer la contraseña duran 30 minutos.')).toBeTruthy()
    expect(screen.queryByLabelText(/^Contraseña nueva/)).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Pedir un enlace nuevo' }))
    expect(screen.getByRole('button', { name: 'Enviar enlace' })).toBeTruthy()
  })

  it('oculta el formulario ante token inválido', async () => {
    const restablecerContrasena = vi.fn().mockRejectedValue(
      new ApiError(401, { code: 'TOKEN_RECUPERACION_INVALIDO' }, null),
    )
    renderizar({ politicaPassword: vi.fn().mockResolvedValue(politica), restablecerContrasena }, '/recuperar-contrasena?token=usado')
    await screen.findByText(/Al menos 10 caracteres/)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/^Contraseña nueva/), 'Nueva-Segura-2026!')
    await user.type(screen.getByLabelText(/^Repite la contraseña/), 'Nueva-Segura-2026!')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    expect(await screen.findByText('Este enlace ya no es válido. Puede que ya lo hayas usado o que hayas pedido otro más reciente.')).toBeTruthy()
    expect(screen.queryByLabelText(/^Contraseña nueva/)).toBeNull()
  })

  it('422 marca reglas; éxito limpia la sesión y deja volver al login con aviso', async () => {
    const almacen = crearAlmacenSesion()
    almacen.aceptar(sesionDe([]))
    const restablecerContrasena = vi.fn()
      .mockRejectedValueOnce(new ApiError(422, { code: 'POLITICA_INCUMPLIDA', errores: [{ regla: 'YA_UTILIZADA' }] }, null))
      .mockResolvedValueOnce(undefined)
    renderizar({ politicaPassword: vi.fn().mockResolvedValue(politica), restablecerContrasena }, '/recuperar-contrasena?token=valido', almacen)
    await screen.findByText(/Al menos 10 caracteres/)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/^Contraseña nueva/), 'Nueva-Segura-2026!')
    await user.type(screen.getByLabelText(/^Repite la contraseña/), 'Nueva-Segura-2026!')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    expect(await screen.findByText('La contraseña nueva no cumple las reglas marcadas.')).toBeTruthy()
    expect(screen.getByText(/Que no sea una de tus últimas 5/).textContent).toMatch(/No cumple/)
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    expect(await screen.findByText('Tu contraseña se actualizó. Ya puedes iniciar sesión.')).toBeTruthy()
    expect(almacen.estado().tipo).toBe('sin-sesion')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(await screen.findByText('Tu contraseña se actualizó. Ya puedes iniciar sesión.')).toBeTruthy()
  })

  it('al terminar desde Marketplace limpia token y canal y ofrece el login permitido', async () => {
    const G1 = 'https://g1-marketplace-frontend.vercel.app/login'
    vi.stubEnv('VITE_RETORNO_MARKETPLACE', G1)
    const restablecerContrasena = vi.fn().mockResolvedValue(undefined)
    window.history.replaceState(null, '', '/recuperar-contrasena?token=token-prueba&canal=MARKETPLACE')
    renderizarConNavegador({ politicaPassword: vi.fn().mockResolvedValue(politica), restablecerContrasena })
    await screen.findByText(/Al menos 10 caracteres/)
    await waitFor(() => expect(window.location.search).toBe(''))
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/^Contraseña nueva/), 'Nueva-Segura-2026!')
    await user.type(screen.getByLabelText(/^Repite la contraseña/), 'Nueva-Segura-2026!')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    const retorno = await screen.findByRole('link', { name: 'Iniciar sesión' })
    expect(retorno.getAttribute('href')).toBe(G1)
    expect(retorno.getAttribute('href')).not.toContain('token-prueba')
    expect(window.location.search).toBe('')
  })

  it('un canal manipulado nunca dirige fuera del login propio', async () => {
    const restablecerContrasena = vi.fn().mockResolvedValue(undefined)
    window.history.replaceState(null, '', '/recuperar-contrasena?token=token-prueba&canal=https%3A%2F%2Fotro-sitio.example')
    renderizarConNavegador({ politicaPassword: vi.fn().mockResolvedValue(politica), restablecerContrasena })
    await screen.findByText(/Al menos 10 caracteres/)
    await waitFor(() => expect(window.location.search).toBe(''))
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/^Contraseña nueva/), 'Nueva-Segura-2026!')
    await user.type(screen.getByLabelText(/^Repite la contraseña/), 'Nueva-Segura-2026!')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Iniciar sesión' })).toBeNull()
    expect(window.location.search).toBe('')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    await waitFor(() => expect(window.location.pathname).toBe('/login'))
    expect(window.location.search).toBe('')
  })

  it('al abrir la ruta de recuperación sin token muestra el formulario para solicitar enlace', () => {
    renderizar({}, '/recuperar-contrasena')
    expect(screen.getByRole('heading', { name: 'Recuperar contraseña' })).toBeTruthy()
    expect(screen.queryByLabelText(/^Contraseña nueva/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Enviar enlace' })).toBeTruthy()
  })
})
