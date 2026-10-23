import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { crearAlmacenSesion } from '../../shared/almacenSesion'
import { ApiError, RedError } from '../../shared/errores'
import type { Usuario } from '../../shared/tipos'
import { renderizar, sesionDe } from '../../test/renderizar'

const id = '00000000-0000-4000-8000-00000000f00f'
const cuenta: Usuario = { id, nombres: 'Cuenta', apellidos: 'Prueba', nombreCompleto: 'Cuenta Prueba', correo: 'c@example.test',
  estado: 'ACTIVO', correoVerificado: true, mfaHabilitado: false, roles: ['CLIENTE'] }
function sesion(permisos = ['usuario.ver', 'cuenta.bloquear']) {
  const almacen = crearAlmacenSesion(); almacen.aceptar(sesionDe(permisos, ['ADMIN_SISTEMA'])); return almacen
}
describe('FEAT-08 acciones del detalle', () => {
  it('bloquea doble envío y cierre mientras la operación está en vuelo', async () => {
    const user = userEvent.setup(); let resolver!: () => void
    const pendiente = new Promise<void>((resolve) => { resolver = resolve })
    const bloquearUsuario = vi.fn().mockReturnValue(pendiente)
    renderizar({ obtenerUsuario: vi.fn().mockResolvedValue(cuenta), bloquearUsuario }, `/admin/usuarios/${id}`, sesion())
    await user.click(await screen.findByRole('button', { name: 'Bloquear' }))
    await user.type(await screen.findByLabelText('Motivo (obligatorio)'), 'Revisión')
    await user.dblClick(screen.getByRole('button', { name: 'Confirmar' }))
    expect(bloquearUsuario).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveProperty('disabled', true)
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeTruthy()
    await act(async () => { resolver(); await pendiente })
  })
  it('no repite tras fallo de red ni habilita acciones si falla la consulta posterior', async () => {
    const user = userEvent.setup()
    const obtenerUsuario = vi.fn().mockResolvedValueOnce(cuenta).mockRejectedValue(new RedError())
    const bloquearUsuario = vi.fn().mockRejectedValue(new RedError())
    renderizar({ obtenerUsuario, bloquearUsuario }, `/admin/usuarios/${id}`, sesion())
    await user.click(await screen.findByRole('button', { name: 'Bloquear' }))
    await user.type(await screen.findByLabelText('Motivo (obligatorio)'), 'Revisión')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    await user.click(await screen.findByRole('button', { name: 'Consultar estado' }))
    await screen.findByText('No se pudo confirmar el estado. Intenta consultar nuevamente.')
    expect(screen.queryByRole('button', { name: 'Bloquear' })).toBeNull()
    expect(bloquearUsuario).toHaveBeenCalledTimes(1)
  })
  it('sin permiso no ofrece acciones', async () => {
    renderizar({ obtenerUsuario: vi.fn().mockResolvedValue(cuenta) }, `/admin/usuarios/${id}`, sesion(['usuario.ver']))
    await screen.findByRole('heading', { name: 'Cuenta Prueba' })
    expect(screen.queryByRole('button', { name: 'Bloquear' })).toBeNull()
  })
  it('no permite bloquear la propia cuenta', async () => {
    const propia = { ...cuenta, id: sesionDe([]).usuario.id }
    renderizar({ obtenerUsuario: vi.fn().mockResolvedValue(propia) }, `/admin/usuarios/${propia.id}`, sesion())
    await screen.findByRole('heading', { name: 'Cuenta Prueba' })
    expect(screen.queryByRole('button', { name: 'Bloquear' })).toBeNull()
  })
  it('valida motivo vacío y largo antes de enviar', async () => {
    const user = userEvent.setup(); const bloquearUsuario = vi.fn()
    renderizar({ obtenerUsuario: vi.fn().mockResolvedValue(cuenta), bloquearUsuario }, `/admin/usuarios/${id}`, sesion())
    await user.click(await screen.findByRole('button', { name: 'Bloquear' }))
    await user.click(await screen.findByRole('button', { name: 'Confirmar' }))
    await screen.findByText('Escribe el motivo del bloqueo.')
    const motivo = await screen.findByLabelText('Motivo (obligatorio)')
    await user.click(motivo); await user.paste('x'.repeat(501))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    await screen.findByText('El motivo no puede superar los 500 caracteres.')
    expect(bloquearUsuario).not.toHaveBeenCalled()
  })
  it('bloquea, recarga y permite desbloquear el estado manual', async () => {
    const user = userEvent.setup()
    const bloqueada: Usuario = { ...cuenta, estado: 'BLOQUEADO', bloqueo: { tipo: 'MANUAL', hasta: null, motivo: 'Revisión' } }
    const obtenerUsuario = vi.fn().mockResolvedValueOnce(cuenta).mockResolvedValueOnce(bloqueada).mockResolvedValue(cuenta)
    const bloquearUsuario = vi.fn().mockResolvedValue(undefined); const desbloquearUsuario = vi.fn().mockResolvedValue(undefined)
    renderizar({ obtenerUsuario, bloquearUsuario, desbloquearUsuario }, `/admin/usuarios/${id}`, sesion())
    await user.click(await screen.findByRole('button', { name: 'Bloquear' }))
    await user.type(await screen.findByLabelText('Motivo (obligatorio)'), 'Revisión')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(bloquearUsuario).toHaveBeenCalledWith(id, 'Revisión')
    await user.click(await screen.findByRole('button', { name: 'Desbloquear' }))
    await user.click(await screen.findByRole('button', { name: 'Confirmar' }))
    await waitFor(() => expect(desbloquearUsuario).toHaveBeenCalledWith(id))
    await waitFor(() => expect(obtenerUsuario).toHaveBeenCalledTimes(3))
  })
  it('el automático permite sustituir por manual y el rechazo mantiene el diálogo', async () => {
    const user = userEvent.setup()
    const bloqueada: Usuario = { ...cuenta, estado: 'BLOQUEADO', bloqueo: { tipo: 'AUTOMATICO', hasta: null } }
    renderizar({ obtenerUsuario: vi.fn().mockResolvedValue(bloqueada), bloquearUsuario: vi.fn().mockRejectedValue(
      new ApiError(422, { code: 'ADMINISTRADOR_PROTEGIDO' }, null)) }, `/admin/usuarios/${id}`, sesion())
    await user.click(await screen.findByRole('button', { name: 'Bloquear manualmente' }))
    await user.type(await screen.findByLabelText('Motivo (obligatorio)'), 'Revisión')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    await screen.findByText('No puedes hacer esto con tu propia cuenta ni con el último administrador del sistema activo.')
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' })).toBeTruthy()
  })
})
