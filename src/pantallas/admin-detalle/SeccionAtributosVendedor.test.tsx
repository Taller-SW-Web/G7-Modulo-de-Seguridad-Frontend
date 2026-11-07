import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { crearAlmacenSesion } from '../../shared/almacenSesion'
import { ApiError } from '../../shared/errores'
import type { Problem, Usuario } from '../../shared/tipos'
import { renderizar, sesionDe } from '../../test/renderizar'
import { esFechaValida } from './validarAtributosVendedor'

// FEAT-04-T6 — edición administrativa de atributos de vendedor en FRONT-08.
const id = '00000000-0000-4000-8000-0000000000b1'
const vendedor: Usuario = { id, nombres: 'Victor', apellidos: 'Ventas', nombreCompleto: 'Victor Ventas',
  correo: 'v@tienda.test', estado: 'ACTIVO', correoVerificado: true, mfaHabilitado: false, roles: ['VENDEDOR'] }

function sesion(permisos = ['usuario.ver', 'atributos.editar']) {
  const almacen = crearAlmacenSesion(); almacen.aceptar(sesionDe(permisos, ['ADMIN_SISTEMA'])); return almacen
}

function error(status: number, code: string, extra: Partial<Problem> = {}) {
  return new ApiError(status, { type: 'about:blank', title: code, status, code, ...extra }, null)
}

async function abrirFormulario() {
  const user = userEvent.setup()
  const seccion = await screen.findByRole('region', { name: 'Atributos de vendedor' })
  await user.click(within(seccion).getByRole('button', { name: 'Editar atributos' }))
  return { user, seccion }
}

describe('FEAT-04-T6 atributos de vendedor', () => {
  it('no aparece si la cuenta no tiene el rol VENDEDOR', async () => {
    renderizar({ obtenerUsuario: vi.fn().mockResolvedValue({ ...vendedor, roles: ['CLIENTE'] }) },
      `/admin/usuarios/${id}`, sesion())
    await screen.findByRole('heading', { name: 'Victor Ventas' })
    expect(screen.queryByRole('region', { name: 'Atributos de vendedor' })).toBeNull()
  })

  it('sin atributos.editar muestra los datos pero no el botón', async () => {
    renderizar({ obtenerUsuario: vi.fn().mockResolvedValue(vendedor) }, `/admin/usuarios/${id}`, sesion(['usuario.ver']))
    const seccion = await screen.findByRole('region', { name: 'Atributos de vendedor' })
    expect(within(seccion).queryByRole('button', { name: 'Editar atributos' })).toBeNull()
  })

  it('envía solo lo que cambió y muestra lo que devuelve el servidor', async () => {
    const actualizarAtributosVendedor = vi.fn().mockResolvedValue({
      ...vendedor, codigoVendedor: 'VEND-1042', tienda: 'TIENDA-MIRAFLORES', fechaIngreso: '2026-03-01' })
    renderizar({ obtenerUsuario: vi.fn().mockResolvedValue({ ...vendedor, tienda: 'Centro' }), actualizarAtributosVendedor },
      `/admin/usuarios/${id}`, sesion())
    const { user, seccion } = await abrirFormulario()
    await user.type(within(seccion).getByLabelText('Código de vendedor'), ' VEND-1042 ')
    await user.clear(within(seccion).getByLabelText('Tienda'))
    await user.type(within(seccion).getByLabelText('Tienda'), 'TIENDA-MIRAFLORES')
    await user.type(within(seccion).getByLabelText('Fecha de ingreso'), '2026-03-01')
    await user.click(within(seccion).getByRole('button', { name: 'Guardar' }))
    expect(actualizarAtributosVendedor).toHaveBeenCalledWith(id,
      { codigoVendedor: 'VEND-1042', tienda: 'TIENDA-MIRAFLORES', fechaIngreso: '2026-03-01' })
    expect(await within(seccion).findByText('TIENDA-MIRAFLORES')).toBeTruthy()
    expect(within(seccion).getByText('VEND-1042')).toBeTruthy()
  })

  it('un campo vaciado viaja como null y uno sin cambios no viaja', async () => {
    const actualizarAtributosVendedor = vi.fn().mockResolvedValue({ ...vendedor, codigoVendedor: 'VEND-1', tienda: null })
    renderizar({ obtenerUsuario: vi.fn().mockResolvedValue({ ...vendedor, codigoVendedor: 'VEND-1', tienda: 'Centro' }),
      actualizarAtributosVendedor }, `/admin/usuarios/${id}`, sesion())
    const { user, seccion } = await abrirFormulario()
    await user.clear(within(seccion).getByLabelText('Tienda'))
    await user.click(within(seccion).getByRole('button', { name: 'Guardar' }))
    expect(actualizarAtributosVendedor).toHaveBeenCalledWith(id, { tienda: null })
  })

  it('sin cambios cierra el formulario sin llamar al servidor', async () => {
    const actualizarAtributosVendedor = vi.fn()
    renderizar({ obtenerUsuario: vi.fn().mockResolvedValue(vendedor), actualizarAtributosVendedor },
      `/admin/usuarios/${id}`, sesion())
    const { user, seccion } = await abrirFormulario()
    await user.click(within(seccion).getByRole('button', { name: 'Guardar' }))
    expect(actualizarAtributosVendedor).not.toHaveBeenCalled()
    expect(within(seccion).getByRole('button', { name: 'Editar atributos' })).toBeTruthy()
  })

  it('valida la fecha antes de enviar', async () => {
    const actualizarAtributosVendedor = vi.fn()
    renderizar({ obtenerUsuario: vi.fn().mockResolvedValue(vendedor), actualizarAtributosVendedor },
      `/admin/usuarios/${id}`, sesion())
    const { user, seccion } = await abrirFormulario()
    await user.type(within(seccion).getByLabelText('Fecha de ingreso'), '2026-02-30')
    await user.click(within(seccion).getByRole('button', { name: 'Guardar' }))
    expect(await within(seccion).findByText('Escribe una fecha válida.')).toBeTruthy()
    expect(actualizarAtributosVendedor).not.toHaveBeenCalled()
  })

  it('traduce ATRIBUTO_NO_APLICABLE y SCOPE_INSUFICIENTE', async () => {
    const actualizarAtributosVendedor = vi.fn()
      .mockRejectedValueOnce(error(422, 'ATRIBUTO_NO_APLICABLE'))
      .mockRejectedValueOnce(error(403, 'SCOPE_INSUFICIENTE'))
    renderizar({ obtenerUsuario: vi.fn().mockResolvedValue(vendedor), actualizarAtributosVendedor },
      `/admin/usuarios/${id}`, sesion())
    const { user, seccion } = await abrirFormulario()
    await user.type(within(seccion).getByLabelText('Tienda'), 'Centro')
    await user.click(within(seccion).getByRole('button', { name: 'Guardar' }))
    expect(await within(seccion).findByText('Ese dato no aplica a una cuenta con estos roles.')).toBeTruthy()
    await user.click(within(seccion).getByRole('button', { name: 'Guardar' }))
    expect(await within(seccion).findByText('No tienes permiso para realizar esta acción.')).toBeTruthy()
  })

  it('muestra VALIDACION del servidor bajo su campo', async () => {
    const actualizarAtributosVendedor = vi.fn().mockRejectedValue(
      error(400, 'VALIDACION', { errores: [{ campo: 'tienda', mensaje: 'máximo 100 caracteres' }] }))
    renderizar({ obtenerUsuario: vi.fn().mockResolvedValue(vendedor), actualizarAtributosVendedor },
      `/admin/usuarios/${id}`, sesion())
    const { user, seccion } = await abrirFormulario()
    await user.type(within(seccion).getByLabelText('Tienda'), 'Centro')
    await user.click(within(seccion).getByRole('button', { name: 'Guardar' }))
    expect(await within(seccion).findByText('máximo 100 caracteres')).toBeTruthy()
  })
})

describe('esFechaValida', () => {
  it('acepta fechas reales y rechaza formatos o días inexistentes', () => {
    expect(esFechaValida('2026-03-01')).toBe(true)
    expect(esFechaValida('2024-02-29')).toBe(true)
    expect(esFechaValida('2026-02-29')).toBe(false)
    expect(esFechaValida('01/03/2026')).toBe(false)
  })
})
