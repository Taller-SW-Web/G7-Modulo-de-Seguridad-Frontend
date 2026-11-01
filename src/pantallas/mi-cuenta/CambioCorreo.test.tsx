import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { crearAlmacenSesion } from '../../shared/almacenSesion'
import { ApiError, RedError } from '../../shared/errores'
import { renderizar, sesionDe } from '../../test/renderizar'

const PERFIL = {
  id: 'u-1',
  nombres: 'Ana',
  apellidos: 'Prueba',
  nombreCompleto: 'Ana Prueba',
  correo: 'actual@correo.com',
  estado: 'ACTIVO',
  correoVerificado: true,
  roles: ['CLIENTE'],
} as const

function conSesion() {
  const almacen = crearAlmacenSesion()
  almacen.aceptar(sesionDe([]))
  return almacen
}

async function abrirDialogo(u: ReturnType<typeof userEvent.setup>) {
  await u.click(await screen.findByRole('button', { name: 'Cambiar correo' }))
  return screen.findByRole('dialog')
}

async function completar(
  u: ReturnType<typeof userEvent.setup>,
  dialogo: HTMLElement,
  correo: string,
  contrasena: string,
) {
  if (correo) await u.type(within(dialogo).getByLabelText('Correo nuevo'), correo)
  if (contrasena) await u.type(within(dialogo).getByLabelText(/^Contraseña actual/), contrasena)
}

function preparar(solicitarCambioCorreo: ReturnType<typeof vi.fn>) {
  const perfilPropio = vi.fn().mockResolvedValue({ ...PERFIL })
  const almacen = conSesion()
  // MiCuentaPage monta SeccionDirecciones para CLIENTE: su API simulada debe incluir listarDirecciones.
  const listarDirecciones = vi.fn().mockResolvedValue({ direcciones: [] })
  renderizar({ perfilPropio, solicitarCambioCorreo, listarDirecciones }, '/mi-cuenta', almacen)
  return { almacen, u: userEvent.setup() }
}

describe('FRONT-06 cambio de correo', () => {
  it('UI-06.4: envía el enlace, avisa y el correo visible sigue siendo el actual', async () => {
    const solicitar = vi.fn().mockResolvedValue(undefined)
    const { u } = preparar(solicitar)
    const dialogo = await abrirDialogo(u)
    await completar(u, dialogo, '  nuevo@correo.com ', 'Clave-Actual-1')
    await u.click(within(dialogo).getByRole('button', { name: 'Enviar enlace' }))

    expect(solicitar).toHaveBeenCalledTimes(1)
    expect(solicitar).toHaveBeenCalledWith('u-1', 'nuevo@correo.com', 'Clave-Actual-1')
    const aviso = await screen.findByText(/^Te enviamos un enlace/)
    expect(aviso.textContent).toBe(
      'Te enviamos un enlace a nuevo@correo.com. Hasta que lo confirmes, sigues entrando con actual@correo.com. También avisamos a tu correo actual.',
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    // El correo visible (cabecera y dato) sigue siendo el actual, no el nuevo.
    expect(screen.getAllByText('actual@correo.com').length).toBeGreaterThan(0)
    expect(screen.queryByText('nuevo@correo.com')).toBeNull()
  })

  it('UI-06.5: contraseña equivocada muestra el error, no cierra la sesión ni cambia nada', async () => {
    const solicitar = vi.fn().mockRejectedValue(new ApiError(401, { code: 'CREDENCIALES_INVALIDAS' }, null))
    const { almacen, u } = preparar(solicitar)
    const dialogo = await abrirDialogo(u)
    await completar(u, dialogo, 'nuevo@correo.com', 'equivocada')
    await u.click(within(dialogo).getByRole('button', { name: 'Enviar enlace' }))

    expect(await within(dialogo).findByText('La contraseña actual no es correcta.')).toBeTruthy()
    expect(screen.getByRole('dialog')).toBe(dialogo)
    expect(almacen.tokens()).not.toBeNull()
    expect(screen.queryByText(/Te enviamos un enlace/)).toBeNull()
    expect(screen.getAllByText('actual@correo.com').length).toBeGreaterThan(0)
    // La contraseña escrita se borra del campo tras el rechazo.
    expect((within(dialogo).getByLabelText(/^Contraseña actual/) as HTMLInputElement).value).toBe('')
  })

  it('CORREO_NO_DISPONIBLE muestra el mensaje neutro bajo el correo y no sale el aviso', async () => {
    const solicitar = vi.fn().mockRejectedValue(new ApiError(409, { code: 'CORREO_NO_DISPONIBLE' }, null))
    const { u } = preparar(solicitar)
    const dialogo = await abrirDialogo(u)
    await completar(u, dialogo, 'ocupado@correo.com', 'Clave-Actual-1')
    await u.click(within(dialogo).getByRole('button', { name: 'Enviar enlace' }))

    expect(await within(dialogo).findByText('No puedes usar ese correo. Prueba con otro.')).toBeTruthy()
    expect(screen.queryByText(/Te enviamos un enlace/)).toBeNull()
  })

  it('valida en el cliente sin llamar a la API: vacío, formato y mismo correo', async () => {
    const solicitar = vi.fn()
    const { u } = preparar(solicitar)
    const dialogo = await abrirDialogo(u)
    const enviar = within(dialogo).getByRole('button', { name: 'Enviar enlace' })

    await u.click(enviar)
    expect(within(dialogo).getByText('Escribe un correo válido.')).toBeTruthy()
    expect(within(dialogo).getByText('Escribe tu contraseña actual.')).toBeTruthy()

    await u.type(within(dialogo).getByLabelText('Correo nuevo'), 'ACTUAL@correo.com')
    await u.type(within(dialogo).getByLabelText(/^Contraseña actual/), 'x')
    await u.click(enviar)
    expect(within(dialogo).getByText('Es el mismo correo que ya usas.')).toBeTruthy()
    expect(solicitar).not.toHaveBeenCalled()
  })

  it('no envía dos veces con doble clic mientras la petición sigue en curso', async () => {
    let resolver: () => void = () => { }
    const solicitar = vi.fn().mockReturnValue(new Promise<void>((r) => { resolver = r }))
    const { u } = preparar(solicitar)
    const dialogo = await abrirDialogo(u)
    await completar(u, dialogo, 'nuevo@correo.com', 'Clave-Actual-1')
    const enviar = within(dialogo).getByRole('button', { name: 'Enviar enlace' })
    await u.dblClick(enviar)
    expect(solicitar).toHaveBeenCalledTimes(1)
    resolver()
    expect(await screen.findByText(/^Te enviamos un enlace/)).toBeTruthy()
  })

  it('un error de red o del servicio muestra el mensaje general sin datos sensibles', async () => {
    const solicitar = vi.fn().mockRejectedValue(new RedError())
    const { u } = preparar(solicitar)
    const dialogo = await abrirDialogo(u)
    await completar(u, dialogo, 'nuevo@correo.com', 'Clave-Secreta-9')
    await u.click(within(dialogo).getByRole('button', { name: 'Enviar enlace' }))

    const alerta = await within(dialogo).findByRole('alert')
    expect(alerta.textContent).toBe('No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.')
    expect(document.body.textContent).not.toContain('Clave-Secreta-9')
  })

  it('un 503 muestra «no disponible» y no el detalle del servidor', async () => {
    const solicitar = vi
      .fn()
      .mockRejectedValue(new ApiError(503, { code: 'NO_DISPONIBLE', detail: 'smtp.interno:25 caído' }, null))
    const { u } = preparar(solicitar)
    const dialogo = await abrirDialogo(u)
    await completar(u, dialogo, 'nuevo@correo.com', 'Clave-Actual-1')
    await u.click(within(dialogo).getByRole('button', { name: 'Enviar enlace' }))

    const alerta = await within(dialogo).findByRole('alert')
    expect(alerta.textContent).toBe('El servicio no está disponible en este momento. Intenta de nuevo en unos minutos.')
    expect(document.body.textContent).not.toContain('smtp.interno')
  })

  it('Cancelar y Escape cierran el diálogo sin llamar a la API ni dejar la contraseña escrita', async () => {
    const solicitar = vi.fn()
    const { u } = preparar(solicitar)
    let dialogo = await abrirDialogo(u)
    await completar(u, dialogo, 'nuevo@correo.com', 'Clave-Actual-1')
    await u.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    dialogo = await abrirDialogo(u)
    expect((within(dialogo).getByLabelText('Correo nuevo') as HTMLInputElement).value).toBe('')
    expect((within(dialogo).getByLabelText(/^Contraseña actual/) as HTMLInputElement).value).toBe('')
    await u.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(solicitar).not.toHaveBeenCalled()
  })
})