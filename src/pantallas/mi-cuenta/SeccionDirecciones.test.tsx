import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { crearAlmacenSesion } from '../../shared/almacenSesion'
import { ApiError } from '../../shared/errores'
import type { Direccion, Usuario } from '../../shared/tipos'
import { renderizar, sesionDe } from '../../test/renderizar'
import { validarDireccion } from './validarDireccion'

const cliente: Usuario = { id: 'u-1', nombres: 'Ana', apellidos: 'Real', nombreCompleto: 'Ana Real', correo: 'a@g7.test',
  estado: 'ACTIVO', roles: ['CLIENTE'] }

const casa: Direccion = { id: 'd-1', etiqueta: 'Casa', departamento: 'Lima', provincia: 'Lima', distrito: 'San Isidro',
  direccion: 'Av. Javier Prado 123', referencia: 'Frente al parque', esPredeterminada: true }
const oficina: Direccion = { id: 'd-2', etiqueta: 'Oficina', departamento: 'Lima', provincia: 'Lima', distrito: 'Miraflores',
  direccion: 'Calle Las Flores 45', referencia: null, esPredeterminada: false }

function conSesion() {
  const almacen = crearAlmacenSesion()
  almacen.aceptar(sesionDe([]))
  return almacen
}

function montar(api: Parameters<typeof renderizar>[0], perfil: Usuario = cliente) {
  return renderizar({ perfilPropio: vi.fn().mockResolvedValue(perfil), ...api }, '/mi-cuenta', conSesion())
}

async function abrirFormulario() {
  const u = userEvent.setup()
  await u.click(await screen.findByRole('button', { name: 'Añadir dirección' }))
  return u
}

async function llenarObligatorios(u: ReturnType<typeof userEvent.setup>) {
  await u.type(screen.getByLabelText(/^Departamento/), 'Lima')
  await u.type(screen.getByLabelText(/^Provincia/), 'Lima')
  await u.type(screen.getByLabelText(/^Distrito/), 'Surco')
  await u.type(screen.getByLabelText(/^Dirección/), 'Jr. Los Pinos 9')
}

describe('FRONT-06 direcciones (validación de cliente)', () => {
  it('exige departamento, provincia, distrito y dirección, y limita la longitud', () => {
    const vacios = { etiqueta: '', departamento: ' ', provincia: '', distrito: '', direccion: '', referencia: '', esPredeterminada: false }
    expect(validarDireccion(vacios)).toEqual({
      departamento: 'Este campo es obligatorio.', provincia: 'Este campo es obligatorio.',
      distrito: 'Este campo es obligatorio.', direccion: 'Este campo es obligatorio.',
    })
    const largos = { ...vacios, departamento: 'a', provincia: 'a', distrito: 'a', direccion: 'a', etiqueta: 'e'.repeat(51), referencia: 'r'.repeat(256) }
    expect(validarDireccion(largos)).toEqual({ etiqueta: 'Máximo 50 caracteres.', referencia: 'Máximo 255 caracteres.' })
  })
})

describe('FRONT-06 direcciones (pantalla)', () => {
  it('un cliente ve sus direcciones con la predeterminada marcada, pedidas con el id de /auth/me', async () => {
    const listarDirecciones = vi.fn().mockResolvedValue({ direcciones: [casa, oficina] })
    montar({ listarDirecciones })
    expect(await screen.findByText('Av. Javier Prado 123')).toBeTruthy()
    expect(screen.getByText('Calle Las Flores 45')).toBeTruthy()
    expect(screen.getAllByText('Predeterminada')).toHaveLength(1)
    expect(listarDirecciones).toHaveBeenCalledWith('u-1', expect.any(AbortSignal))
  })

  it('sin direcciones muestra el aviso y el botón para añadir', async () => {
    montar({ listarDirecciones: vi.fn().mockResolvedValue({ direcciones: [] }) })
    expect(await screen.findByText('Aún no tienes direcciones guardadas.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Añadir dirección' })).toBeTruthy()
  })

  it('un vendedor sin rol CLIENTE no ve la sección ni la pide al backend', async () => {
    const listarDirecciones = vi.fn()
    montar({ listarDirecciones }, { ...cliente, roles: ['VENDEDOR'] })
    expect(await screen.findByText('Ana Real')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Direcciones' })).toBeNull()
    expect(listarDirecciones).not.toHaveBeenCalled()
  })

  it('si falla la carga muestra el error y permite reintentar', async () => {
    const listarDirecciones = vi.fn()
      .mockRejectedValueOnce(new ApiError(503, { code: 'NO_DISPONIBLE' }, null))
      .mockResolvedValueOnce({ direcciones: [casa] })
    montar({ listarDirecciones })
    const u = userEvent.setup()
    await u.click(await screen.findByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Av. Javier Prado 123')).toBeTruthy()
  })

  it('no envía el alta si faltan los campos obligatorios', async () => {
    const crearDireccion = vi.fn()
    montar({ listarDirecciones: vi.fn().mockResolvedValue({ direcciones: [] }), crearDireccion })
    const u = await abrirFormulario()
    await u.click(screen.getByRole('button', { name: 'Guardar dirección' }))
    expect(await screen.findAllByText('Este campo es obligatorio.')).toHaveLength(4)
    expect(crearDireccion).not.toHaveBeenCalled()
  })

  it('al guardar una predeterminada recarga la lista y la anterior pierde la marca', async () => {
    const nueva: Direccion = { id: 'd-3', etiqueta: 'Nueva', departamento: 'Lima', provincia: 'Lima', distrito: 'Surco',
      direccion: 'Jr. Los Pinos 9', referencia: null, esPredeterminada: true }
    const listarDirecciones = vi.fn()
      .mockResolvedValueOnce({ direcciones: [casa] })
      .mockResolvedValueOnce({ direcciones: [{ ...casa, esPredeterminada: false }, nueva] })
    const crearDireccion = vi.fn().mockResolvedValue(nueva)
    montar({ listarDirecciones, crearDireccion })
    const u = await abrirFormulario()
    await llenarObligatorios(u)
    await u.type(screen.getByLabelText('Etiqueta'), 'Nueva')
    await u.click(screen.getByLabelText('Usar como predeterminada'))
    await u.click(screen.getByRole('button', { name: 'Guardar dirección' }))
    await waitFor(() => expect(crearDireccion).toHaveBeenCalledWith('u-1', {
      etiqueta: 'Nueva', departamento: 'Lima', provincia: 'Lima', distrito: 'Surco', direccion: 'Jr. Los Pinos 9',
      esPredeterminada: true,
    }))
    expect(await screen.findByText('Jr. Los Pinos 9')).toBeTruthy()
    expect(listarDirecciones).toHaveBeenCalledTimes(2)
    expect(screen.getAllByText('Predeterminada')).toHaveLength(1)
    expect(screen.queryByRole('form', { name: 'Nueva dirección' })).toBeNull()
  })

  it('un 400 VALIDACION del backend aparece bajo su campo', async () => {
    const crearDireccion = vi.fn().mockRejectedValue(new ApiError(400,
      { code: 'VALIDACION', errores: [{ campo: 'distrito', mensaje: 'valor inválido' }] }, null))
    montar({ listarDirecciones: vi.fn().mockResolvedValue({ direcciones: [] }), crearDireccion })
    const u = await abrirFormulario()
    await llenarObligatorios(u)
    await u.click(screen.getByRole('button', { name: 'Guardar dirección' }))
    expect(await screen.findByText('valor inválido')).toBeTruthy()
  })

  it('un 403 muestra el mensaje de permiso sin datos del servidor', async () => {
    const crearDireccion = vi.fn().mockRejectedValue(new ApiError(403, { code: 'SCOPE_INSUFICIENTE', detail: 'secreto' }, null))
    montar({ listarDirecciones: vi.fn().mockResolvedValue({ direcciones: [] }), crearDireccion })
    const u = await abrirFormulario()
    await llenarObligatorios(u)
    await u.click(screen.getByRole('button', { name: 'Guardar dirección' }))
    expect(await screen.findByText('No tienes permiso para realizar esta acción.')).toBeTruthy()
    expect(screen.queryByText('secreto')).toBeNull()
  })

  it('un doble clic en Guardar envía una sola petición', async () => {
    let resolver: (d: Direccion) => void = () => {}
    const crearDireccion = vi.fn().mockReturnValue(new Promise<Direccion>((r) => { resolver = r }))
    montar({ listarDirecciones: vi.fn().mockResolvedValue({ direcciones: [] }), crearDireccion })
    const u = await abrirFormulario()
    await llenarObligatorios(u)
    const guardar = screen.getByRole('button', { name: 'Guardar dirección' })
    await u.dblClick(guardar)
    expect(crearDireccion).toHaveBeenCalledTimes(1)
    resolver(casa)
  })
})
