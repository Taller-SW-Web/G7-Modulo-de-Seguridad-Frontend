import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { crearAlmacenSesion } from '../../shared/almacenSesion'
import { ApiError } from '../../shared/errores'
import { renderizar, sesionDe } from '../../test/renderizar'
import { validarPerfil } from './validarPerfil'

const perfil = { id: 'u-1', nombres: 'Ana', apellidos: 'Real', nombreCompleto: 'Ana Real', correo: 'a@g7.test',
  estado: 'ACTIVO', roles: ['CLIENTE'] }

const listarDirecciones = () => Promise.resolve({ direcciones: [] })

function conSesion() {
  const almacen = crearAlmacenSesion()
  almacen.aceptar(sesionDe([]))
  return almacen
}

describe('FRONT-06 edición propia', () => {
  it('valida nombres y celular en el cliente', () => {
    expect(validarPerfil({ nombres: ' ', apellidos: 'X', celular: '987' })).toEqual({
      nombres: 'Escribe tus nombres.', celular: 'Escribe el celular como +51 y 9 dígitos.' })
    expect(validarPerfil({ nombres: 'Ana', apellidos: 'Real', celular: '+51987654321' })).toEqual({})
  })

  it('envía solo los campos cambiados y muestra el perfil actualizado', async () => {
    const actualizarPerfilPropio = vi.fn().mockResolvedValue({ ...perfil, celular: '+51987654321' })
    renderizar({ perfilPropio: vi.fn().mockResolvedValue(perfil), actualizarPerfilPropio, listarDirecciones }, '/mi-cuenta', conSesion())
    const u = userEvent.setup()
    await u.click(await screen.findByRole('button', { name: 'Editar mis datos' }))
    await u.type(screen.getByLabelText('Celular'), '+51987654321')
    await u.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(actualizarPerfilPropio).toHaveBeenCalledWith('u-1', { celular: '+51987654321' }))
    expect(await screen.findByText('+51987654321')).toBeTruthy()
  })

  it('un 400 VALIDACION del backend aparece bajo su campo', async () => {
    const actualizarPerfilPropio = vi.fn().mockRejectedValue(new ApiError(400,
      { code: 'VALIDACION', errores: [{ campo: 'nombres', mensaje: 'máximo 100 caracteres' }] }, null))
    renderizar({ perfilPropio: vi.fn().mockResolvedValue(perfil), actualizarPerfilPropio, listarDirecciones }, '/mi-cuenta', conSesion())
    const u = userEvent.setup()
    await u.click(await screen.findByRole('button', { name: 'Editar mis datos' }))
    await u.clear(screen.getByLabelText(/^Nombres/))
    await u.type(screen.getByLabelText(/^Nombres/), 'Otro')
    await u.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('máximo 100 caracteres')).toBeTruthy()
  })
})
