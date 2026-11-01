import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError, RedError } from '../../shared/errores'
import type { PoliticaPassword } from '../../shared/tipos'
import { renderizar } from '../../test/renderizar'
import { contieneDatosPersonales, mensajesPolitica } from './validarRegistro'

const politica: PoliticaPassword = {
  longitudMinima: 10, requiereMayuscula: true, requiereMinuscula: true, requiereDigito: true,
  requiereCaracterEspecial: true, rechazaComunes: true, rechazaDatosPersonales: true, historial: 5,
}

function api(registrar = vi.fn().mockResolvedValue({ id: 'u-1', estado: 'PENDIENTE_VERIFICACION' })) {
  return { registrar, politicaPassword: vi.fn().mockResolvedValue(politica) }
}

async function completar(user: ReturnType<typeof userEvent.setup>, cambios: { celular?: string; terminos?: boolean } = {}) {
  await user.type(screen.getByLabelText(/^Nombres/), 'María')
  await user.type(screen.getByLabelText(/^Apellidos/), 'Quispe Rojas')
  await user.type(screen.getByLabelText(/^Correo/), 'maria@ejemplo.com')
  await user.type(screen.getByLabelText(/^Celular/), cambios.celular ?? '987654321')
  await user.type(screen.getByLabelText(/^Contraseña/), 'Zorzal-Andino-2026!')
  await user.type(screen.getByLabelText(/^Repite la contraseña/), 'Zorzal-Andino-2026!')
  if (cambios.terminos ?? true) await user.click(screen.getByRole('checkbox'))
}

describe('FEAT-01-T5 FRONT-02 registro de cliente', () => {
  it('UI-02.1 registra por WEB con +51, sin sesión, y pasa a FRONT-03 con el correo enmascarado', async () => {
    const dobles = api()
    const { almacen } = renderizar(dobles, '/registro')
    const user = userEvent.setup()
    await completar(user)
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByText('m***a@ejemplo.com')).toBeTruthy()
    expect(dobles.registrar).toHaveBeenCalledWith({
      correo: 'maria@ejemplo.com', contrasena: 'Zorzal-Andino-2026!', nombres: 'María', apellidos: 'Quispe Rojas',
      celular: '+51987654321', aceptaTerminos: true, canalOrigen: 'WEB',
    })
    expect(almacen.tokens()).toBeNull()
  })

  it('UI-02.2 el medidor marca en vivo cada regla y deja «común» para el guardado', async () => {
    renderizar(api(), '/registro')
    const user = userEvent.setup()
    // La spec usa «marketplace», pero tiene 11 caracteres y sí cumple la longitud mínima de 10.
    await user.type(screen.getByLabelText(/^Contraseña/), 'mercado')
    const reglas = within(screen.getByRole('list', { name: 'Requisitos de la contraseña' }))
    expect(reglas.getByText(/Una letra minúscula/).textContent).toContain('Cumple')
    for (const texto of [/Al menos 10 caracteres/, /Una letra mayúscula/, /Un número/, /Un carácter especial/]) {
      expect(reglas.getByText(texto).textContent).toContain('No cumple')
    }
    expect(reglas.getByText(/contraseña común/).textContent).toContain('Se comprueba al guardar')
    expect(reglas.queryByText(/últimas/)).toBeNull() // el historial no aplica a una cuenta nueva
  })

  it('UI-02.3 sin aceptar los términos no envía nada y enfoca la casilla', async () => {
    const dobles = api()
    renderizar(dobles, '/registro')
    const user = userEvent.setup()
    await completar(user, { terminos: false })
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    const mensaje = 'Debes aceptar los términos y el tratamiento de tus datos personales para crear tu cuenta.'
    expect((await screen.findAllByText(mensaje)).length).toBeGreaterThan(0)
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('checkbox')))
    expect(dobles.registrar).not.toHaveBeenCalled()
  })

  it('UI-02.4 un celular de 8 dígitos muestra su error al salir del campo', async () => {
    renderizar(api(), '/registro')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/^Celular/), '98765432')
    expect(screen.queryByText('Escribe los 9 dígitos de tu celular.')).toBeNull()
    await user.tab()
    expect(await screen.findByText('Escribe los 9 dígitos de tu celular.')).toBeTruthy()
  })

  it('UI-02.5 correo no disponible: mensaje neutro con enlaces y el formulario intacto', async () => {
    const registrar = vi.fn().mockRejectedValue(new ApiError(409, { code: 'CORREO_NO_DISPONIBLE' }, null))
    renderizar(api(registrar), '/registro')
    const user = userEvent.setup()
    await completar(user)
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain('Si ya tienes una cuenta, puedes iniciar sesión o recuperar tu contraseña.')
    expect(within(alerta).getByRole('link', { name: 'Iniciar sesión' })).toBeTruthy()
    expect(within(alerta).getByRole('link', { name: 'Recuperar mi contraseña' })).toBeTruthy()
    expect((screen.getByLabelText(/^Nombres/) as HTMLInputElement).value).toBe('María')
    expect((screen.getByLabelText(/^Contraseña/) as HTMLInputElement).value).toBe('Zorzal-Andino-2026!')
  })

  it('UI-02.6 el 422 marca la regla común en el medidor y pone su mensaje bajo la contraseña', async () => {
    const registrar = vi.fn().mockRejectedValue(new ApiError(422, {
      code: 'POLITICA_INCUMPLIDA', errores: [{ regla: 'CONTRASENA_COMUN' }],
    }, null))
    renderizar(api(registrar), '/registro')
    const user = userEvent.setup()
    await completar(user)
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect((await screen.findAllByText('Es una contraseña demasiado común. Elige otra.')).length).toBeGreaterThan(0)
    const reglas = within(screen.getByRole('list', { name: 'Requisitos de la contraseña' }))
    expect(reglas.getByText(/contraseña común/).textContent).toContain('No cumple')
  })

  it('UI-02.7 si la política no carga, el formulario sigue funcionando', async () => {
    const dobles = { ...api(), politicaPassword: vi.fn().mockRejectedValue(new RedError()) }
    renderizar(dobles, '/registro')
    expect(await screen.findByText(/No pudimos cargar las reglas de contraseña/)).toBeTruthy()
    const user = userEvent.setup()
    await completar(user)
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    await waitFor(() => expect(dobles.registrar).toHaveBeenCalled())
  })

  it('el 400 del backend se muestra bajo cada campo y 503 deja el formulario intacto', async () => {
    const registrar = vi.fn()
      .mockRejectedValueOnce(new ApiError(400, {
        code: 'VALIDACION', errores: [{ campo: 'celular', mensaje: 'Debe ser +51 seguido de 9 dígitos.' }],
      }, null))
      .mockRejectedValueOnce(new ApiError(503, { code: 'NO_DISPONIBLE' }, null))
    renderizar(api(registrar), '/registro')
    const user = userEvent.setup()
    await completar(user)
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect((await screen.findAllByText('Escribe los 9 dígitos de tu celular.')).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(await screen.findByText(/El servicio no está disponible en este momento/)).toBeTruthy()
    expect((screen.getByLabelText(/^Correo/) as HTMLInputElement).value).toBe('maria@ejemplo.com')
  })

  it('el login ofrece crear una cuenta', async () => {
    renderizar(api(), '/login')
    const user = userEvent.setup()
    await user.click(screen.getByRole('link', { name: 'Crear una cuenta' }))
    expect(await screen.findByRole('heading', { name: 'Crear una cuenta' })).toBeTruthy()
  })
})

describe('FRONT-02 validaciones orientativas', () => {
  const base = { nombres: 'María José', apellidos: 'Quispe', correo: 'mjq@ejemplo.com', celular: '', confirmacion: '', aceptaTerminos: true }

  it('detecta nombre, apellido o parte local del correo, sin distinguir tildes ni mayúsculas', () => {
    expect(contieneDatosPersonales({ ...base, contrasena: 'Jose-2026-Segura!' })).toBe(true)
    expect(contieneDatosPersonales({ ...base, contrasena: 'QUISPE#2026x' })).toBe(true)
    expect(contieneDatosPersonales({ ...base, contrasena: 'Clave-MJQ-2026' })).toBe(true)
    expect(contieneDatosPersonales({ ...base, contrasena: 'Zorzal-Andino-2026!' })).toBe(false)
  })

  it('traduce cada regla del 422 a su mensaje y usa uno genérico para las desconocidas', () => {
    expect(mensajesPolitica([{ regla: 'LONGITUD_MINIMA', esperado: 10 }, { regla: 'NUEVA_REGLA' }]))
      .toEqual(['Debe tener al menos 10 caracteres.', 'La contraseña no cumple los requisitos.'])
  })
})
