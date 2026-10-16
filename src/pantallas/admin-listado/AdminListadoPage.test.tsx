import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { crearAlmacenSesion } from '../../shared/almacenSesion'
import { ApiError } from '../../shared/errores'
import type { PaginaUsuarios, Usuario } from '../../shared/tipos'
import { renderizar, sesionDe } from '../../test/renderizar'
import { filtrosDesdeUrl } from './useListadoUsuarios'

const ana: Usuario = {
  id: '00000000-0000-4000-8000-00000000f00a',
  nombreCompleto: 'Ana Prueba',
  correo: 'cliente.a@fixtures.g7.test',
  estado: 'ACTIVO',
  roles: ['CLIENTE'],
}
const bloqueada: Usuario = {
  id: '00000000-0000-4000-8000-00000000f00e',
  nombreCompleto: 'Luis Prueba',
  correo: 'bloqueo@fixtures.g7.test',
  estado: 'BLOQUEADO',
  roles: ['CLIENTE'],
  bloqueo: { tipo: 'MANUAL', hasta: null },
}

function pagina(usuarios: Usuario[], total = usuarios.length): PaginaUsuarios {
  return { usuarios, pagina: 1, tamano: 20, total }
}

function comoAdmin() {
  const almacen = crearAlmacenSesion()
  almacen.aceptar(sesionDe(['usuario.ver', 'rol.asignar'], ['ADMIN_SISTEMA']))
  return almacen
}

describe('FRONT-07 listado administrativo', () => {
  it('lista cuentas con estado en texto, roles con etiqueta canónica y total', async () => {
    const listarUsuarios = vi.fn().mockResolvedValue(pagina([ana, bloqueada], 2))
    renderizar({ listarUsuarios }, '/admin/usuarios', comoAdmin())

    expect(await screen.findByText('cliente.a@fixtures.g7.test')).toBeTruthy()
    expect(screen.getByText('Bloqueada sin vencimiento')).toBeTruthy()
    expect(screen.getAllByText('Cliente').length).toBeGreaterThan(0)
    expect(screen.getByText(/2 cuentas · Página 1 de 1/)).toBeTruthy()
    expect(screen.getByRole('table').querySelector('caption')?.textContent).toBe('Todas las cuentas')
    expect(listarUsuarios).toHaveBeenCalledWith({ pagina: 1, tamano: 20 }, expect.any(AbortSignal))
  })

  it('los filtros viven en la URL y solo pasan valores del contrato', async () => {
    const listarUsuarios = vi.fn().mockResolvedValue(pagina([]))
    renderizar({ listarUsuarios }, '/admin/usuarios?estado=BLOQUEADO&rol=HACKER&tamano=500&correo=%20ana%20', comoAdmin())
    await waitFor(() => expect(listarUsuarios).toHaveBeenCalled())
    expect(listarUsuarios.mock.calls[0][0]).toEqual({ estado: 'BLOQUEADO', correo: 'ana', pagina: 1, tamano: 100 })
    expect(await screen.findByText('Ninguna cuenta coincide con los filtros.')).toBeTruthy()
  })

  it('el buscador consulta 300 ms después de dejar de escribir y vuelve a la página 1', async () => {
    const listarUsuarios = vi.fn().mockResolvedValue(pagina([ana]))
    renderizar({ listarUsuarios }, '/admin/usuarios?pagina=3', comoAdmin())
    await screen.findByText('cliente.a@fixtures.g7.test')
    listarUsuarios.mockClear()
    await userEvent.setup().type(screen.getByLabelText('Buscar por correo'), 'ana')
    await waitFor(() => expect(listarUsuarios).toHaveBeenCalledTimes(1), { timeout: 1500 })
    expect(listarUsuarios.mock.calls[0][0]).toEqual({ correo: 'ana', pagina: 1, tamano: 20 })
  })

  it('sin permiso usuario.ver no monta la pantalla ni llama al endpoint', async () => {
    const almacen = crearAlmacenSesion()
    almacen.aceptar(sesionDe([]))
    const listarUsuarios = vi.fn()
    renderizar({ listarUsuarios }, '/admin/usuarios', almacen)
    expect(await screen.findByText('No tienes permiso para realizar esta acción.')).toBeTruthy()
    expect(listarUsuarios).not.toHaveBeenCalled()
  })

  it('un 403 del backend muestra sin permiso y un 503 permite reintentar', async () => {
    const listarUsuarios = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(503, { code: 'NO_DISPONIBLE' }, null))
      .mockResolvedValueOnce(pagina([ana]))
    renderizar({ listarUsuarios }, '/admin/usuarios', comoAdmin())
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('cliente.a@fixtures.g7.test')).toBeTruthy()
  })

  it('filtrosDesdeUrl descarta páginas y tamaños inválidos', () => {
    expect(filtrosDesdeUrl(new URLSearchParams('pagina=-2&tamano=abc'))).toEqual({
      estado: undefined,
      rol: undefined,
      correo: undefined,
      pagina: 1,
      tamano: 20,
    })
  })
})
