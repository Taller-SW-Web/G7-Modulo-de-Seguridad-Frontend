import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { evaluarReglas } from '../../componentes/reglasPassword'
import { crearAlmacenSesion } from '../../shared/almacenSesion'
import { ApiError } from '../../shared/errores'
import type { PoliticaPassword } from '../../shared/tipos'
import { renderizar, sesionDe } from '../../test/renderizar'

const politica: PoliticaPassword = {
  longitudMinima: 10, requiereMayuscula: true, requiereMinuscula: true, requiereDigito: true,
  requiereCaracterEspecial: true, rechazaComunes: true, rechazaDatosPersonales: true, historial: 5,
}

function conSesion() {
  const almacen = crearAlmacenSesion()
  almacen.aceptar(sesionDe([]))
  return almacen
}

async function llenar(actual: string, nueva: string, repetir = nueva) {
  const u = userEvent.setup()
  if (actual) await u.type(screen.getByLabelText(/^Contraseña actual/), actual)
  if (nueva) await u.type(screen.getByLabelText(/^Contraseña nueva/), nueva)
  if (repetir) await u.type(screen.getByLabelText(/^Repite/), repetir)
  await u.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
}

describe('FRONT-00 §3 medidor', () => {
  it('evalúa las reglas comprobables y deja al servidor las demás', () => {
    const reglas = evaluarReglas(politica, 'Abcdefghi1!')
    expect(reglas.filter((r) => r.estado === 'cumple').map((r) => r.codigo)).toEqual([
      'LONGITUD_MINIMA', 'MAYUSCULA', 'MINUSCULA', 'DIGITO', 'CARACTER_ESPECIAL',
    ])
    expect(reglas.filter((r) => r.estado === 'al-guardar').map((r) => r.codigo)).toEqual([
      'CONTRASENA_COMUN', 'DATOS_PERSONALES', 'YA_UTILIZADA',
    ])
    expect(evaluarReglas(politica, 'corta', new Set(['YA_UTILIZADA'])).find((r) => r.codigo === 'YA_UTILIZADA')?.estado)
      .toBe('no-cumple')
  })
})

describe('FRONT-10 cambio de contraseña', () => {
  it('valida en el cliente sin llamar al backend', async () => {
    const cambiarContrasena = vi.fn()
    renderizar({ politicaPassword: vi.fn().mockResolvedValue(politica), cambiarContrasena }, '/mi-cuenta/contrasena', conSesion())
    await screen.findByText(/Al menos 10 caracteres/)
    await llenar('Actual-2026!', 'Nueva-Segura-2026!', 'otra')
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeTruthy()
    expect(cambiarContrasena).not.toHaveBeenCalled()
  })

  it('actual incorrecta: mensaje bajo el campo sin cerrar la sesión', async () => {
    const almacen = conSesion()
    const cambiarContrasena = vi.fn().mockRejectedValue(new ApiError(401, { code: 'CREDENCIALES_INVALIDAS' }, null))
    renderizar({ politicaPassword: vi.fn().mockResolvedValue(politica), cambiarContrasena }, '/mi-cuenta/contrasena', almacen)
    await llenar('mala', 'Nueva-Segura-2026!')
    expect(await screen.findByText('La contraseña actual no es correcta.')).toBeTruthy()
    expect(almacen.estado().tipo).toBe('activa')
  })

  it('422 marca las reglas rechazadas por el servidor', async () => {
    const cambiarContrasena = vi.fn().mockRejectedValue(
      new ApiError(422, { code: 'POLITICA_INCUMPLIDA', errores: [{ regla: 'YA_UTILIZADA' }] }, null))
    renderizar({ politicaPassword: vi.fn().mockResolvedValue(politica), cambiarContrasena }, '/mi-cuenta/contrasena', conSesion())
    await llenar('Actual-2026!', 'Nueva-Segura-2026!')
    expect(await screen.findByText('La contraseña nueva no cumple las reglas marcadas.')).toBeTruthy()
    expect(screen.getByText(/Que no sea una de tus últimas 5/).textContent).toMatch(/No cumple/)
  })

  it('éxito vuelve a Mi cuenta con la sesión abierta', async () => {
    const cambiarContrasena = vi.fn().mockResolvedValue(undefined)
    const perfilPropio = vi.fn().mockResolvedValue({ id: 'x', nombreCompleto: 'Ana', correo: 'a@g7.test', estado: 'ACTIVO', roles: [] })
    renderizar({ politicaPassword: vi.fn().mockResolvedValue(politica), cambiarContrasena, perfilPropio },
      '/mi-cuenta/contrasena', conSesion())
    await llenar('Actual-2026!', 'Nueva-Segura-2026!')
    await waitFor(() => expect(cambiarContrasena).toHaveBeenCalledWith('Actual-2026!', 'Nueva-Segura-2026!'))
    expect(await screen.findByRole('heading', { name: 'Mi cuenta' })).toBeTruthy()
  })

  it('sin política el formulario sigue funcionando', async () => {
    renderizar({ politicaPassword: vi.fn().mockRejectedValue(new Error('x')), cambiarContrasena: vi.fn() },
      '/mi-cuenta/contrasena', conSesion())
    expect(await screen.findByText(/No pudimos cargar las reglas/)).toBeTruthy()
  })
})
