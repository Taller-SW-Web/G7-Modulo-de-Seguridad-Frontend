import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { crearAlmacenSesion } from '../../shared/almacenSesion'
import { renderizar, sesionDe } from '../../test/renderizar'

function conSesion() {
  const almacen = crearAlmacenSesion()
  almacen.aceptar(sesionDe([]))
  return almacen
}

const TITULAR = '00000000-0000-4000-8000-00000000f00a'

describe('FRONT-13 actividad propia', () => {
  it('muestra acciones con texto, destaca las sospechosas y marca lo hecho por un administrador', async () => {
    const actividadPropia = vi.fn().mockResolvedValue({
      pagina: 1, tamano: 20, total: 3,
      registros: [
        { id: '1', fecha: '2026-10-17T15:00:00Z', accion: 'SESION_INICIADA', resultado: 'EXITO', actorTipo: 'USUARIO', actorId: TITULAR, ip: '10.0.0.1' },
        { id: '2', fecha: '2026-10-17T14:59:00Z', accion: 'SESION_FALLIDA', resultado: 'FALLO', actorTipo: 'USUARIO', actorId: TITULAR, ip: '10.0.0.9' },
        { id: '3', fecha: '2026-10-17T14:00:00Z', accion: 'ROL_ASIGNADO', resultado: 'EXITO', actorTipo: 'USUARIO', actorId: 'otro-admin' },
      ],
    })
    renderizar({ actividadPropia }, '/mi-cuenta/actividad', conSesion())
    expect(await screen.findByText('Inicio de sesión')).toBeTruthy()
    expect(screen.getByText('Intento de inicio de sesión fallido')).toBeTruthy()
    expect(screen.getAllByText('Atención')).toHaveLength(1)
    expect(screen.getByText('Rol asignado (por un administrador)')).toBeTruthy()
    expect(actividadPropia).toHaveBeenCalledWith(1, expect.any(AbortSignal))
  })

  it('vacío', async () => {
    renderizar({ actividadPropia: vi.fn().mockResolvedValue({ pagina: 1, tamano: 20, total: 0, registros: [] }) },
      '/mi-cuenta/actividad', conSesion())
    expect(await screen.findByText('No hay actividad registrada en los últimos 90 días.')).toBeTruthy()
  })
})
