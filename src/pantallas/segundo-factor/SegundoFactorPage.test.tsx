import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { crearAlmacenSesion } from '../../shared/almacenSesion'
import { ApiError, RedError } from '../../shared/errores'
import type { Api } from '../../shared/api'
import type { Usuario } from '../../shared/tipos'
import { renderizar, sesionDe } from '../../test/renderizar'

const perfil: Usuario = { id: 'cuenta-test', nombreCompleto: 'Ana Prueba', correo: 'ana@example.test',
  estado: 'ACTIVO', roles: ['CLIENTE'], mfaHabilitado: false }
const enviado = { mfaChangeToken: 'cambio-test', canal: 'EMAIL', destinoEnmascarado: 'a***@example.test', expiraEn: 300, cambioExpiraEn: 600 }
function montar(api: Partial<Api>, p = perfil) {
  const almacen = crearAlmacenSesion(); almacen.aceptar(sesionDe([], p.roles))
  return renderizar({ perfilPropio: vi.fn().mockResolvedValue(p), ...api }, '/mi-cuenta/seguridad', almacen)
}
async function codigo() {
  const usuario = userEvent.setup()
  await usuario.click(screen.getByLabelText('Dígito 1 de 6')); await usuario.keyboard('012345')
}
function deshabilitado(nombre: string) { return (screen.getByRole('button', { name: nombre }) as HTMLButtonElement).disabled }

describe('FRONT-09 configuración MFA', () => {
  it('confirma activación y relee perfil sin cambiar el estado al recibir 202', async () => {
    const perfilPropio = vi.fn().mockResolvedValueOnce(perfil).mockResolvedValue({ ...perfil, mfaHabilitado: true })
    const mfaSolicitar = vi.fn().mockResolvedValue(enviado)
    const mfaConfirmar = vi.fn().mockResolvedValue(undefined)
    montar({ perfilPropio, mfaSolicitar, mfaConfirmar })
    await userEvent.click(await screen.findByRole('button', { name: 'Activar' }))
    expect(mfaSolicitar).toHaveBeenCalledWith('HABILITAR')
    expect(await screen.findByText(/Enviamos el código a/)).toBeTruthy()
    expect(perfilPropio).toHaveBeenCalledTimes(1)
    await codigo(); await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(mfaConfirmar).toHaveBeenCalledWith('cambio-test', '012345')
    expect(await screen.findByText('Segundo factor activo.')).toBeTruthy()
    expect(perfilPropio).toHaveBeenCalledTimes(2)
  })
  it('desactivar exige continuar el diálogo antes de solicitar código', async () => {
    const mfaSolicitar = vi.fn().mockResolvedValue(enviado)
    montar({ mfaSolicitar }, { ...perfil, mfaHabilitado: true })
    await userEvent.click(await screen.findByRole('button', { name: 'Desactivar' }))
    expect(mfaSolicitar).not.toHaveBeenCalled()
    await userEvent.click(await screen.findByRole('button', { name: 'Continuar' }))
    await waitFor(() => expect(mfaSolicitar).toHaveBeenCalledWith('DESHABILITAR'))
  })
  it('rol de gestión entre varios roles muestra obligatorio aunque la bandera sea false', async () => {
    montar({}, { ...perfil, roles: ['CLIENTE', 'GESTOR_COMERCIAL'] })
    expect(await screen.findByText('Activo, obligatorio para tu rol.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Desactivar' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Activar' })).toBeNull()
  })
  it('código incorrecto conserva operación y muestra intentos restantes', async () => {
    montar({ mfaSolicitar: vi.fn().mockResolvedValue(enviado),
      mfaConfirmar: vi.fn().mockRejectedValue(new ApiError(401, { code: 'CODIGO_INVALIDO', intentosRestantes: 2 }, null)) })
    await userEvent.click(await screen.findByRole('button', { name: 'Activar' }))
    await screen.findByText(/Enviamos el código/); await codigo()
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Te quedan 2 intentos')
    expect(deshabilitado('Confirmar')).toBe(false)
  })
  it('reenvío sustituye respuesta y 429 impide otro envío sin automatismos', async () => {
    const mfaReenviar = vi.fn().mockRejectedValue(new ApiError(429, { code: 'DEMASIADAS_SOLICITUDES' }, 120))
    montar({ mfaSolicitar: vi.fn().mockResolvedValue(enviado), mfaReenviar })
    await userEvent.click(await screen.findByRole('button', { name: 'Activar' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Reenviar código' }))
    expect(await screen.findByText(/Espera 120 s/)).toBeTruthy()
    expect(deshabilitado('Reenviar código')).toBe(true)
    expect(mfaReenviar).toHaveBeenCalledTimes(1)
  })
  it('doble clic no duplica la confirmación pendiente', async () => {
    let resolver!: () => void
    const mfaConfirmar = vi.fn().mockImplementation(() => new Promise<void>((r) => { resolver = r }))
    montar({ mfaSolicitar: vi.fn().mockResolvedValue(enviado), mfaConfirmar })
    await userEvent.click(await screen.findByRole('button', { name: 'Activar' }))
    await screen.findByText(/Enviamos el código/); await codigo()
    await userEvent.dblClick(screen.getByRole('button', { name: 'Confirmar' }))
    expect(mfaConfirmar).toHaveBeenCalledTimes(1)
    await act(async () => resolver())
  })
  it('cancelar borra el token local y exige una solicitud nueva', async () => {
    const mfaSolicitar = vi.fn().mockResolvedValue(enviado)
    montar({ mfaSolicitar })
    await userEvent.click(await screen.findByRole('button', { name: 'Activar' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await userEvent.click(screen.getByRole('button', { name: 'Activar' }))
    expect(mfaSolicitar).toHaveBeenCalledTimes(2)
    expect(window.location.href).not.toContain('cambio-test')
  })
  it('token de cambio inválido termina la sesión sin repetir', async () => {
    const mfaSolicitar = vi.fn().mockRejectedValue(new ApiError(401, { code: 'TOKEN_INVALIDO' }, null))
    const { almacen } = montar({ mfaSolicitar })
    await userEvent.click(await screen.findByRole('button', { name: 'Activar' }))
    await waitFor(() => expect(almacen.estado().tipo).not.toBe('activa'))
    expect(mfaSolicitar).toHaveBeenCalledTimes(1)
  })
  it('red incierta tras confirmar obliga a consultar perfil antes de otra mutación', async () => {
    const perfilPropio = vi.fn().mockResolvedValue(perfil)
    const mfaConfirmar = vi.fn().mockRejectedValue(new RedError())
    montar({ perfilPropio, mfaSolicitar: vi.fn().mockResolvedValue(enviado), mfaConfirmar })
    await userEvent.click(await screen.findByRole('button', { name: 'Activar' }))
    await screen.findByText(/Enviamos el código/); await codigo()
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByText(/El resultado no está confirmado/)).toBeTruthy()
    expect(deshabilitado('Activar')).toBe(true)
    expect(perfilPropio).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('button', { name: 'Consultar estado' }))
    await waitFor(() => expect(deshabilitado('Activar')).toBe(false))
    expect(mfaConfirmar).toHaveBeenCalledTimes(1)
  })
  it('al vencer el cambio borra la operación y exige una nueva solicitud', async () => {
    montar({ mfaSolicitar: vi.fn().mockResolvedValue({ ...enviado, expiraEn: 1, cambioExpiraEn: 1 }) })
    await userEvent.click(await screen.findByRole('button', { name: 'Activar' }))
    expect(await screen.findByText('El cambio venció. Inicia una nueva solicitud.', {}, { timeout: 3000 })).toBeTruthy()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(deshabilitado('Activar')).toBe(false)
  })
  it('código vencido conserva cambio vigente y permite pedir otro código', async () => {
    montar({ mfaSolicitar: vi.fn().mockResolvedValue({ ...enviado, expiraEn: 1 }) })
    await userEvent.click(await screen.findByRole('button', { name: 'Activar' }))
    expect(await screen.findByText('El código venció; solicita otro.', {}, { timeout: 3000 })).toBeTruthy()
    expect(deshabilitado('Confirmar')).toBe(true)
    expect(deshabilitado('Reenviar código')).toBe(false)
  })
})
