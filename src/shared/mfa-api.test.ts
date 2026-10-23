import { describe, expect, it, vi } from 'vitest'
import { crearApi } from './api'
import { crearAlmacenSesion } from './almacenSesion'
import { crearClienteHttp } from './http'
import { RedError } from './errores'
import { sesionDe } from '../test/renderizar'

const BASE = 'https://g7.test/api/v1'
const enviado = { mfaChangeToken: 'cambio-test', canal: 'EMAIL', destinoEnmascarado: 'a***@test', expiraEn: 300, cambioExpiraEn: 600 }
function sesion(segundos: number | null) {
  const original = sesionDe([])
  const claims = segundos === null ? {} : { exp: Math.floor(Date.now() / 1000) + segundos }
  return { ...original, accessToken: `eyJhbGciOiJSUzI1NiJ9.${btoa(JSON.stringify(claims)).replace(/=+$/, '')}.firma` }
}
function json(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), { status })
}
const invalido = () => json(401, { code: 'TOKEN_INVALIDO' })

describe('consumo v2 con cliente compartido', () => {
  it('access vencido al solicitar renueva, repite una vez y conserva la sesión', async () => {
    const almacen = crearAlmacenSesion(); almacen.aceptar(sesion(-1))
    const nueva = sesion(900)
    const fetchSimulado = vi.fn().mockResolvedValueOnce(invalido()).mockResolvedValueOnce(json(200, nueva)).mockResolvedValueOnce(json(202, enviado))
    const api = crearApi(crearClienteHttp(BASE, almacen, fetchSimulado))
    await expect(api.mfaSolicitar('HABILITAR')).resolves.toEqual(enviado)
    expect(fetchSimulado.mock.calls.map((c) => c[0])).toEqual([
      'https://g7.test/api/v2/auth/mfa/cambios', `${BASE}/auth/refresh`, 'https://g7.test/api/v2/auth/mfa/cambios',
    ])
    expect(fetchSimulado.mock.calls[2][1].headers.Authorization).toBe(`Bearer ${nueva.accessToken}`)
    expect(almacen.estado().tipo).toBe('activa')
  })

  it.each(['reenviar', 'confirmar'] as const)('%s renueva antes si quedan menos de 60 s, sin repetir la mutación', async (tipo) => {
    const almacen = crearAlmacenSesion(); almacen.aceptar(sesion(30))
    const nueva = sesion(900)
    const fetchSimulado = vi.fn().mockResolvedValueOnce(json(200, nueva)).mockResolvedValueOnce(tipo === 'reenviar' ? json(202, enviado) : json(204))
    const api = crearApi(crearClienteHttp(BASE, almacen, fetchSimulado))
    await (tipo === 'reenviar' ? api.mfaReenviar('cambio-test') : api.mfaConfirmar('cambio-test', '012345'))
    expect(fetchSimulado.mock.calls.map((c) => c[0])).toEqual([`${BASE}/auth/refresh`, `https://g7.test/api/v2/auth/mfa/cambios/${tipo}`])
    expect(fetchSimulado.mock.calls[1][1].headers.Authorization).toBe(`Bearer ${nueva.accessToken}`)
    expect(JSON.parse(fetchSimulado.mock.calls[1][1].body)).toEqual(tipo === 'reenviar'
      ? { mfaChangeToken: 'cambio-test' } : { mfaChangeToken: 'cambio-test', codigo: '012345' })
    expect(almacen.estado().tipo).toBe('activa')
  })

  it.each(['reenviar', 'confirmar'] as const)('%s con access vigente no renueva ni repite un cambio inválido', async (tipo) => {
    const almacen = crearAlmacenSesion(); almacen.aceptar(sesion(900))
    const fetchSimulado = vi.fn().mockResolvedValue(invalido())
    const api = crearApi(crearClienteHttp(BASE, almacen, fetchSimulado))
    await expect(tipo === 'reenviar' ? api.mfaReenviar('cambio-test') : api.mfaConfirmar('cambio-test', '012345'))
      .rejects.toMatchObject({ code: 'TOKEN_INVALIDO' })
    expect(fetchSimulado).toHaveBeenCalledTimes(1)
  })

  it('las mutaciones comparten una sola renovación preventiva, también sin exp legible', async () => {
    const almacen = crearAlmacenSesion(); almacen.aceptar(sesion(null))
    let liberar!: (r: Response) => void
    const fetchSimulado = vi.fn((url: string) => url.endsWith('/auth/refresh')
      ? new Promise<Response>((r) => { liberar = r }) : Promise.resolve(json(202, enviado)))
    const api = crearApi(crearClienteHttp(BASE, almacen, fetchSimulado))
    const a = api.mfaReenviar('cambio-a'); const b = api.mfaReenviar('cambio-b')
    expect(fetchSimulado).toHaveBeenCalledTimes(1)
    liberar(json(200, sesion(900)))
    await Promise.all([a, b])
    expect(fetchSimulado.mock.calls.filter((c) => c[0].endsWith('/auth/refresh'))).toHaveLength(1)
    expect(fetchSimulado).toHaveBeenCalledTimes(3)
  })

  it('refresh rechazado termina la sesión y no envía la confirmación', async () => {
    const almacen = crearAlmacenSesion(); almacen.aceptar(sesion(-1))
    const fetchSimulado = vi.fn().mockResolvedValue(invalido())
    const api = crearApi(crearClienteHttp(BASE, almacen, fetchSimulado))
    await expect(api.mfaConfirmar('cambio-test', '012345')).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetchSimulado).toHaveBeenCalledTimes(1)
    expect(almacen.estado()).toEqual({ tipo: 'sin-sesion', motivo: 'vencida' })
  })

  it('fallo de red al renovar no envía la mutación ni borra la sesión', async () => {
    const almacen = crearAlmacenSesion(); almacen.aceptar(sesion(-1))
    const fetchSimulado = vi.fn().mockRejectedValue(new TypeError('sin red'))
    const api = crearApi(crearClienteHttp(BASE, almacen, fetchSimulado))
    await expect(api.mfaReenviar('cambio-test')).rejects.toBeInstanceOf(RedError)
    expect(fetchSimulado).toHaveBeenCalledTimes(1)
    expect(almacen.estado().tipo).toBe('activa')
  })

  it('logout durante renovación no restaura sesión ni envía la mutación', async () => {
    const almacen = crearAlmacenSesion(); almacen.aceptar(sesion(-1))
    let liberar!: (r: Response) => void
    const fetchSimulado = vi.fn(() => new Promise<Response>((r) => { liberar = r }))
    const api = crearApi(crearClienteHttp(BASE, almacen, fetchSimulado))
    const pendiente = api.mfaConfirmar('cambio-test', '012345').catch((e: unknown) => e)
    almacen.terminar('cerrada'); liberar(json(200, sesion(900)))
    expect(await pendiente).toMatchObject({ name: 'AbortError' })
    expect(almacen.estado()).toEqual({ tipo: 'sin-sesion', motivo: 'cerrada' })
    expect(fetchSimulado).toHaveBeenCalledTimes(1)
  })

  it('base mal configurada no se convierte en RedError ni llama fetch', async () => {
    const almacen = crearAlmacenSesion(); almacen.aceptar(sesion(900))
    const fetchSimulado = vi.fn()
    const api = crearApi(crearClienteHttp('https://g7.test/api', almacen, fetchSimulado))
    const error: unknown = await api.mfaConfirmar('cambio-test', '012345').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeInstanceOf(RedError)
    expect(fetchSimulado).not.toHaveBeenCalled()
  })
})
