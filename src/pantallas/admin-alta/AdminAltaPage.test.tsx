import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { crearAlmacenSesion } from '../../shared/almacenSesion'
import { ApiError } from '../../shared/errores'
import type { Usuario } from '../../shared/tipos'
import { renderizar, sesionDe } from '../../test/renderizar'
import { TEXTOS_ALTA } from './AdminAltaPage'

const nueva: Usuario = { id: '00000000-0000-4000-8000-0000000a1a7a', nombres: 'Gina', apellidos: 'Gestora',
  nombreCompleto: 'Gina Gestora', correo: 'gina@ejemplo.com', estado: 'PENDIENTE_VERIFICACION', correoVerificado: false,
  mfaHabilitado: true, roles: ['GESTOR_COMERCIAL'] }

function sesion(permisos = ['usuario.ver', 'usuario.crear']) {
  const almacen = crearAlmacenSesion(); almacen.aceptar(sesionDe(permisos, ['ADMIN_SISTEMA'])); return almacen
}

async function completar(user: ReturnType<typeof userEvent.setup>, rol?: string) {
  await user.type(await screen.findByLabelText(/^Correo/), ' gina@ejemplo.com ')
  await user.type(screen.getByLabelText(/^Nombres/), 'Gina')
  await user.type(screen.getByLabelText(/^Apellidos/), 'Gestora')
  if (rol) await user.selectOptions(screen.getByLabelText(/^Rol/), rol)
}

describe('FEAT-13 alta administrativa (FRONT-11)', () => {
  it('UI-11.1/11.2: crea un gestor sin contraseña, avisa del segundo factor y muestra la cuenta pendiente', async () => {
    const user = userEvent.setup()
    const crearUsuario = vi.fn().mockResolvedValue(nueva)
    renderizar({ crearUsuario }, '/admin/usuarios/nuevo', sesion())

    await completar(user, 'GESTOR_COMERCIAL')
    expect(screen.getByText(TEXTOS_ALTA.gestion)).toBeTruthy()
    expect(screen.queryByLabelText(/contraseña/i)).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByText(TEXTOS_ALTA.creada)).toBeTruthy()
    expect(crearUsuario).toHaveBeenCalledWith({ correo: 'gina@ejemplo.com', nombres: 'Gina', apellidos: 'Gestora',
      rol: 'GESTOR_COMERCIAL' })
    expect(screen.getByText(nueva.id)).toBeTruthy()
    expect(screen.getByText(/Gestor comercial/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ver detalle' }).getAttribute('href')).toBe(`/admin/usuarios/${nueva.id}`)
    expect(screen.queryByText(/Ya puede iniciar sesión/i)).toBeNull()
  })

  it('UI-11.4: «Sin rol» omite el campo rol y muestra «Sin rol»', async () => {
    const user = userEvent.setup()
    const crearUsuario = vi.fn().mockResolvedValue({ ...nueva, roles: [] })
    renderizar({ crearUsuario }, '/admin/usuarios/nuevo', sesion())

    await completar(user)
    expect(screen.queryByText(TEXTOS_ALTA.gestion)).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByText(TEXTOS_ALTA.creada)).toBeTruthy()
    const cuerpo = crearUsuario.mock.calls[0][0]
    expect(cuerpo).toEqual({ correo: 'gina@ejemplo.com', nombres: 'Gina', apellidos: 'Gestora' })
    expect('rol' in cuerpo).toBe(false)
    expect(screen.getByText(/Sin rol/, { selector: 'p' })).toBeTruthy()
  })

  it('UI-11.5: CLIENTE no aparece entre los roles', async () => {
    renderizar({}, '/admin/usuarios/nuevo', sesion())
    const opciones = Array.from((await screen.findByLabelText(/^Rol/) as HTMLSelectElement).options).map((o) => o.value)
    expect(opciones).toEqual(['', 'VENDEDOR', 'ADMIN_VENTAS', 'GESTOR_DESPACHO', 'GESTOR_COMERCIAL', 'ADMIN_SISTEMA'])
  })

  it('valida en el cliente y no envía datos incompletos', async () => {
    const user = userEvent.setup()
    const crearUsuario = vi.fn()
    renderizar({ crearUsuario }, '/admin/usuarios/nuevo', sesion())

    await user.type(await screen.findByLabelText(/^Correo/), 'no-es-correo')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByText('Escribe un correo válido.')).toBeTruthy()
    expect(screen.getByText('Escribe los nombres.')).toBeTruthy()
    expect(screen.getByText('Escribe los apellidos.')).toBeTruthy()
    expect(crearUsuario).not.toHaveBeenCalled()
  })

  it('UI-11.3: 409 muestra el mensaje genérico en el correo', async () => {
    const user = userEvent.setup()
    const crearUsuario = vi.fn().mockRejectedValue(new ApiError(409, { status: 409, code: 'CORREO_NO_DISPONIBLE' }, null))
    renderizar({ crearUsuario }, '/admin/usuarios/nuevo', sesion())

    await completar(user, 'VENDEDOR')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByText(TEXTOS_ALTA.correoNoDisponible)).toBeTruthy()
    expect(screen.queryByText(TEXTOS_ALTA.creada)).toBeNull()
  })

  it('400 VALIDACION del servidor se muestra bajo cada campo', async () => {
    const user = userEvent.setup()
    const crearUsuario = vi.fn().mockRejectedValue(new ApiError(400, { status: 400, code: 'VALIDACION',
      errores: [{ campo: 'nombres', mensaje: 'Admite como máximo 100 caracteres.' }] }, null))
    renderizar({ crearUsuario }, '/admin/usuarios/nuevo', sesion())

    await completar(user)
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByText('Admite como máximo 100 caracteres.')).toBeTruthy()
  })

  it('UI-11.6: con usuario.crear sin usuario.ver no ofrece el detalle ni el listado', async () => {
    const user = userEvent.setup()
    const crearUsuario = vi.fn().mockResolvedValue(nueva)
    renderizar({ crearUsuario }, '/admin/usuarios/nuevo', sesion(['usuario.crear']))

    await completar(user, 'VENDEDOR')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByText(nueva.id)).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Ver detalle' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Volver al listado' })).toBeNull()
  })

  it('sin usuario.crear no monta el formulario ni llama al alta', async () => {
    const crearUsuario = vi.fn()
    renderizar({ crearUsuario }, '/admin/usuarios/nuevo', sesion(['usuario.ver']))

    expect(await screen.findByText('Acceso restringido')).toBeTruthy()
    expect(screen.queryByLabelText(/^Correo/)).toBeNull()
  })

  it('el listado ofrece «Nueva cuenta» solo con usuario.crear', async () => {
    const listarUsuarios = vi.fn().mockResolvedValue({ usuarios: [], pagina: 0, tamano: 20, total: 0 })
    const { unmount } = renderizar({ listarUsuarios }, '/admin/usuarios', sesion())
    expect((await screen.findByRole('link', { name: 'Nueva cuenta' })).getAttribute('href')).toBe('/admin/usuarios/nuevo')
    unmount()

    renderizar({ listarUsuarios }, '/admin/usuarios', sesion(['usuario.ver']))
    expect(await screen.findByText('Todavía no hay cuentas.')).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Nueva cuenta' })).toBeNull()
  })
})
