import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { crearAlmacenSesion } from '../../shared/almacenSesion'
import { ApiError } from '../../shared/errores'
import type { PoliticaPassword } from '../../shared/tipos'
import { renderizar, sesionDe } from '../../test/renderizar'
import { TEXTOS_ACTIVACION } from './ActivacionCuentaPage'

const politica: PoliticaPassword = {
  longitudMinima: 10, requiereMayuscula: true, requiereMinuscula: true, requiereDigito: true,
  requiereCaracterEspecial: true, rechazaComunes: true, rechazaDatosPersonales: true, historial: 5,
}
const CLAVE = 'Zorzal-Andino-2026!'

function api(activarCuenta = vi.fn().mockResolvedValue(undefined)) {
  return { activarCuenta, politicaPassword: vi.fn().mockResolvedValue(politica) }
}

async function completar(user: ReturnType<typeof userEvent.setup>, { terminos = true, repetir = CLAVE } = {}) {
  await user.type(await screen.findByLabelText(/^Contraseña/), CLAVE)
  await user.type(screen.getByLabelText(/^Repite la contraseña/), repetir)
  if (terminos) await user.click(screen.getByRole('checkbox'))
  await user.click(screen.getByRole('button', { name: 'Activar mi cuenta' }))
}

describe('FEAT-13 activación de cuenta (SPEC-03 RF-03.5, issue #36)', () => {
  it('ESC-03.5: define la contraseña, acepta los términos y lleva al login', async () => {
    const user = userEvent.setup()
    const servicios = api()
    renderizar(servicios, '/activar-cuenta?token=tok-123')

    await completar(user)

    expect(await screen.findByText(TEXTOS_ACTIVACION.activada)).toBeTruthy()
    expect(servicios.activarCuenta).toHaveBeenCalledWith('tok-123', CLAVE)
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(await screen.findByText(TEXTOS_ACTIVACION.activada)).toBeTruthy() // aviso en el login
  })

  it('sin aceptar los términos o con contraseñas distintas no llama al backend', async () => {
    const user = userEvent.setup()
    const servicios = api()
    renderizar(servicios, '/activar-cuenta?token=tok-123')

    await completar(user, { terminos: false, repetir: 'otra-cosa' })

    expect(await screen.findByText(TEXTOS_ACTIVACION.terminos)).toBeTruthy()
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeTruthy()
    expect(servicios.activarCuenta).not.toHaveBeenCalled()
  })

  it('ESC-03.4: 422 marca las reglas incumplidas y deja el formulario para reintentar', async () => {
    const user = userEvent.setup()
    const servicios = api(vi.fn().mockRejectedValue(new ApiError(422, { status: 422, code: 'POLITICA_INCUMPLIDA',
      errores: [{ regla: 'CONTRASENA_COMUN' }] }, null)))
    renderizar(servicios, '/activar-cuenta?token=tok-123')

    await completar(user)

    expect(await screen.findByText('La contraseña no cumple las reglas marcadas.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Activar mi cuenta' })).toBeTruthy()
  })

  it.each([
    ['ENLACE_EXPIRADO', TEXTOS_ACTIVACION.vencido],
    ['ENLACE_YA_USADO', TEXTOS_ACTIVACION.yaUsado],
  ])('410 %s muestra su mensaje y no el formulario', async (code, texto) => {
    const user = userEvent.setup()
    renderizar(api(vi.fn().mockRejectedValue(new ApiError(410, { status: 410, code }, null))), '/activar-cuenta?token=tok-123')

    await completar(user)

    expect(await screen.findByText(texto)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Activar mi cuenta' })).toBeNull()
  })

  it('la casilla enlaza al texto de los términos 2026-11-v1 en otra pestaña', async () => {
    renderizar(api(), '/activar-cuenta?token=tok-123')
    const enlace = await screen.findByRole('link', { name: 'términos y condiciones' })
    expect(enlace.getAttribute('href')).toBe('/terminos')
    expect(enlace.getAttribute('target')).toBe('_blank')
  })

  it('con otra sesión abierta avisa y la cierra antes de ir al login', async () => {
    const user = userEvent.setup()
    const almacen = crearAlmacenSesion(); almacen.aceptar(sesionDe(['usuario.ver'], ['ADMIN_SISTEMA']))
    const logout = vi.fn().mockResolvedValue(undefined)
    renderizar({ ...api(), logout }, '/activar-cuenta?token=tok-123', almacen)

    await completar(user)

    expect(await screen.findByText(new RegExp(TEXTOS_ACTIVACION.otraSesion))).toBeTruthy()
    expect(screen.queryByText(/ana@g7\.test/)).toBeNull() // el correo de la otra sesión va enmascarado
    await user.click(screen.getByRole('button', { name: 'Cerrar esa sesión e iniciar sesión' }))

    expect(logout).toHaveBeenCalledWith('refresh-1')
    expect(almacen.estado().tipo).toBe('sin-sesion')
    expect(await screen.findByText(TEXTOS_ACTIVACION.activada)).toBeTruthy() // aviso en el login
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeTruthy()
  })

  it('sin token avisa que el enlace está incompleto', async () => {
    renderizar(api(), '/activar-cuenta')
    expect(await screen.findByText(TEXTOS_ACTIVACION.incompleto)).toBeTruthy()
    expect(screen.queryByLabelText(/^Contraseña/)).toBeNull()
  })
})
