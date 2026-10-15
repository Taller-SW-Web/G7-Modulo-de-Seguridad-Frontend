import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { crearAlmacenSesion } from '../../shared/almacenSesion'
import { ApiError } from '../../shared/errores'
import type { Usuario } from '../../shared/tipos'
import { renderizar, sesionDe } from '../../test/renderizar'

const ID = '00000000-0000-4000-8000-00000000f00b'
const cuenta: Usuario = {
  id: ID,
  nombres: 'Beto',
  apellidos: 'Prueba G7',
  nombreCompleto: 'Beto Prueba G7',
  correo: 'cliente.b@fixtures.g7.test',
  correoVerificado: true,
  estado: 'BLOQUEADO',
  bloqueo: { tipo: 'AUTOMATICO', hasta: '2026-10-17T15:30:00Z' },
  roles: ['CLIENTE'],
  mfaHabilitado: false,
}

async function campoAsignar(): Promise<HTMLElement> {
  const campos = await screen.findAllByLabelText('Asignar rol')
  return campos.find((c) => c.tagName === 'INPUT')!
}

function sesion(permisos: string[]) {
  const almacen = crearAlmacenSesion()
  almacen.aceptar(sesionDe(permisos, ['ADMIN_SISTEMA']))
  return almacen
}

describe('FRONT-08 detalle + SeccionRoles', () => {
  it('muestra datos, bloqueo activo y roles', async () => {
    renderizar({ obtenerUsuario: vi.fn().mockResolvedValue(cuenta) }, `/admin/usuarios/${ID}`, sesion(['usuario.ver']))
    expect(await screen.findByRole('heading', { name: 'Beto Prueba G7' })).toBeTruthy()
    const bloqueo = screen.getByRole('region', { name: 'Bloqueo activo' })
    expect(within(bloqueo).getByText(/Automático, por intentos fallidos/)).toBeTruthy()
    expect(screen.getByText('Verificado')).toBeTruthy()
  })

  it('sin rol.asignar no ofrece asignar ni revocar', async () => {
    renderizar({ obtenerUsuario: vi.fn().mockResolvedValue(cuenta) }, `/admin/usuarios/${ID}`, sesion(['usuario.ver']))
    await screen.findByRole('heading', { name: 'Roles' })
    expect(screen.queryAllByLabelText('Asignar rol')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: /Revocar el rol/ })).toBeNull()
  })

  it('asigna un rol de gestión con confirmación, avisa del MFA y recarga el detalle', async () => {
    const obtenerUsuario = vi
      .fn()
      .mockResolvedValueOnce(cuenta)
      .mockResolvedValueOnce({ ...cuenta, roles: ['CLIENTE', 'ADMIN_VENTAS'] })
    const asignarRol = vi.fn().mockResolvedValue({ ...cuenta, roles: ['CLIENTE', 'ADMIN_VENTAS'] })
    renderizar({ obtenerUsuario, asignarRol }, `/admin/usuarios/${ID}`, sesion(['usuario.ver', 'rol.asignar']))
    const u = userEvent.setup()

    await u.click(await campoAsignar())
    await u.click(await screen.findByRole('option', { name: 'Administrador de ventas', hidden: true }))
    await u.click(screen.getByRole('button', { name: 'Asignar' }))
    const dialogo = await screen.findByRole('dialog')
    expect(within(dialogo).getByText(/el segundo factor será obligatorio/)).toBeTruthy()
    await u.click(within(dialogo).getByRole('button', { name: 'Asignar' }))

    await waitFor(() => expect(asignarRol).toHaveBeenCalledWith(ID, 'ADMIN_VENTAS'))
    await waitFor(() => expect(obtenerUsuario).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Administrador de ventas')).toBeTruthy()
  })

  it('revocar el último administrador muestra el error del backend y deja el diálogo abierto', async () => {
    const admin = { ...cuenta, estado: 'ACTIVO' as const, bloqueo: null, roles: ['ADMIN_SISTEMA' as const] }
    const revocarRol = vi.fn().mockRejectedValue(new ApiError(422, { code: 'ADMINISTRADOR_PROTEGIDO' }, null))
    renderizar(
      { obtenerUsuario: vi.fn().mockResolvedValue(admin), revocarRol },
      `/admin/usuarios/${ID}`,
      sesion(['usuario.ver', 'rol.asignar']),
    )
    const u = userEvent.setup()
    await u.click(await screen.findByRole('button', { name: 'Revocar el rol Administrador del sistema' }))
    const dialogo = await screen.findByRole('dialog')
    expect(within(dialogo).getByText(/quedará sin ningún rol/)).toBeTruthy()
    await u.click(within(dialogo).getByRole('button', { name: 'Revocar' }))
    expect((await within(dialogo).findByRole('alert')).textContent).toMatch(/último administrador/)
    expect(revocarRol).toHaveBeenCalledWith(ID, 'ADMIN_SISTEMA')
  })

  it('no ofrece revocar ADMIN_SISTEMA de la propia cuenta', async () => {
    const propia = { ...cuenta, id: '00000000-0000-4000-8000-00000000f00a', roles: ['ADMIN_SISTEMA' as const] }
    renderizar(
      { obtenerUsuario: vi.fn().mockResolvedValue(propia) },
      `/admin/usuarios/${propia.id}`,
      sesion(['usuario.ver', 'rol.asignar']),
    )
    await screen.findByRole('heading', { name: 'Roles' })
    expect(screen.queryByRole('button', { name: /Revocar el rol/ })).toBeNull()
  })

  it('404 muestra que la cuenta no existe', async () => {
    renderizar(
      { obtenerUsuario: vi.fn().mockRejectedValue(new ApiError(404, { code: 'NO_ENCONTRADO' }, null)) },
      `/admin/usuarios/${ID}`,
      sesion(['usuario.ver']),
    )
    expect(await screen.findByText('No encontramos esa cuenta.')).toBeTruthy()
  })
})
