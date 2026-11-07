import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { crearAlmacenSesion } from '../../shared/almacenSesion'
import { ApiError, RedError } from '../../shared/errores'
import type { Usuario } from '../../shared/tipos'
import { renderizar, sesionDe } from '../../test/renderizar'

// Distinto del administrador de sesionDe (…f00a): si coincide, la pantalla la trata como la propia cuenta.
const id = '00000000-0000-4000-8000-00000000f00b'
const cuenta: Usuario = { id, nombres: 'Cuenta', apellidos: 'Prueba', nombreCompleto: 'Cuenta Prueba', correo: 'c@example.test',
  estado: 'ACTIVO', correoVerificado: true, mfaHabilitado: false, roles: ['CLIENTE'] }
function sesion(permisos = ['usuario.ver', 'usuario.desactivar', 'usuario.reactivar']) {
  const almacen = crearAlmacenSesion(); almacen.aceptar(sesionDe(permisos, ['ADMIN_SISTEMA'])); return almacen
}

/** Botón de confirmación dentro del diálogo, ya montado (Mantine lo abre con transición). */
async function confirmacion(nombre: string) {
  return within(await screen.findByRole('dialog')).getByRole('button', { name: nombre })
}

describe('FEAT-02 baja y reactivación en el detalle (FRONT-08)', () => {
  it('da de baja tras confirmar con el texto de FRONT-07 y recarga el detalle', async () => {
    const user = userEvent.setup()
    const obtenerUsuario = vi.fn().mockResolvedValueOnce(cuenta).mockResolvedValue({ ...cuenta, estado: 'INACTIVO' })
    const darDeBajaUsuario = vi.fn().mockResolvedValue(undefined)
    renderizar({ obtenerUsuario, darDeBajaUsuario }, `/admin/usuarios/${id}`, sesion())

    await user.click(await screen.findByRole('button', { name: 'Dar de baja' }))
    expect(await screen.findByText('La cuenta quedará inactiva y se cerrarán sus sesiones. No se borra nada: puedes reactivarla después.')).toBeTruthy()
    expect(screen.getByRole('dialog').textContent).toContain('Dar de baja la cuenta de c@example.test')
    await user.click(await confirmacion('Dar de baja'))

    expect(await screen.findByText('Cuenta dada de baja.')).toBeTruthy()
    expect(darDeBajaUsuario).toHaveBeenCalledWith(id)
    expect(await screen.findByRole('button', { name: 'Reactivar' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Dar de baja' })).toBeNull()
  })

  it('reactiva una cuenta inactiva', async () => {
    const user = userEvent.setup()
    const obtenerUsuario = vi.fn().mockResolvedValueOnce({ ...cuenta, estado: 'INACTIVO' }).mockResolvedValue(cuenta)
    const reactivarUsuario = vi.fn().mockResolvedValue(undefined)
    renderizar({ obtenerUsuario, reactivarUsuario }, `/admin/usuarios/${id}`, sesion())

    await user.click(await screen.findByRole('button', { name: 'Reactivar' }))
    expect(await screen.findByText('Volverá a estar activa con los mismos datos y roles. Tendrá que iniciar sesión de nuevo.')).toBeTruthy()
    await user.click(await confirmacion('Reactivar'))

    expect(await screen.findByText('Cuenta reactivada.')).toBeTruthy()
    expect(reactivarUsuario).toHaveBeenCalledWith(id)
  })

  it('ofrece cada acción solo en su estado y con su permiso', async () => {
    renderizar({ obtenerUsuario: vi.fn().mockResolvedValue({ ...cuenta, estado: 'PENDIENTE_VERIFICACION' }) },
      `/admin/usuarios/${id}`, sesion(['usuario.ver', 'usuario.desactivar']))
    expect(await screen.findByRole('button', { name: 'Dar de baja' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Reactivar' })).toBeNull()
  })

  it('sin permiso o en la propia cuenta no ofrece la baja', async () => {
    renderizar({ obtenerUsuario: vi.fn().mockResolvedValue(cuenta) }, `/admin/usuarios/${id}`, sesion(['usuario.ver']))
    await screen.findByRole('heading', { name: 'Cuenta Prueba' })
    expect(screen.queryByRole('button', { name: 'Dar de baja' })).toBeNull()
  })

  it('en la propia cuenta no aparece «Dar de baja»', async () => {
    const propia = { ...cuenta, id: sesionDe([]).usuario.id }
    renderizar({ obtenerUsuario: vi.fn().mockResolvedValue(propia) }, `/admin/usuarios/${propia.id}`, sesion())
    await screen.findByRole('heading', { name: 'Cuenta Prueba' })
    expect(screen.queryByRole('button', { name: 'Dar de baja' })).toBeNull()
  })

  it('muestra el mensaje de administrador protegido', async () => {
    const user = userEvent.setup()
    const darDeBajaUsuario = vi.fn().mockRejectedValue(new ApiError(422, { code: 'ADMINISTRADOR_PROTEGIDO' }, null))
    renderizar({ obtenerUsuario: vi.fn().mockResolvedValue(cuenta), darDeBajaUsuario }, `/admin/usuarios/${id}`, sesion())
    await user.click(await screen.findByRole('button', { name: 'Dar de baja' }))
    await user.click(await confirmacion('Dar de baja'))
    expect(await screen.findByText('No puedes hacer esto con tu propia cuenta ni con el último administrador del sistema activo.')).toBeTruthy()
  })

  it('no repite tras fallo de red: pide consultar el estado', async () => {
    const user = userEvent.setup()
    const darDeBajaUsuario = vi.fn().mockRejectedValue(new RedError())
    renderizar({ obtenerUsuario: vi.fn().mockResolvedValue(cuenta), darDeBajaUsuario }, `/admin/usuarios/${id}`, sesion())
    await user.click(await screen.findByRole('button', { name: 'Dar de baja' }))
    await user.click(await confirmacion('Dar de baja'))
    expect(await screen.findByRole('button', { name: 'Consultar estado' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Dar de baja' })).toBeNull()
    expect(darDeBajaUsuario).toHaveBeenCalledTimes(1)
  })

  it('bloquea doble envío mientras la operación está en vuelo', async () => {
    const user = userEvent.setup(); let resolver!: () => void
    const pendiente = new Promise<void>((resolve) => { resolver = resolve })
    const darDeBajaUsuario = vi.fn().mockReturnValue(pendiente)
    renderizar({ obtenerUsuario: vi.fn().mockResolvedValue(cuenta), darDeBajaUsuario }, `/admin/usuarios/${id}`, sesion())
    await user.click(await screen.findByRole('button', { name: 'Dar de baja' }))
    await user.dblClick(await confirmacion('Dar de baja'))
    expect(darDeBajaUsuario).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveProperty('disabled', true)
    await act(async () => { resolver(); await pendiente })
  })
})
