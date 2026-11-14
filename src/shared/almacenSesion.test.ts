import { describe, expect, it, vi } from 'vitest'
import { crearAlmacenSesion, permisosDe } from './almacenSesion'
import { crearApi } from './api'
import { crearClienteHttp } from './http'
import { sesionDe } from '../test/renderizar'
import type { SesionIniciada } from './tipos'

// FEAT-16: un access cifrado (JWE, cinco partes) no se puede leer en el navegador.
const CIFRADO = 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIiwiY3R5IjoiSldUIn0..iv.textoCifrado.etiqueta'

function sesionCifrada(permisos: string[], expiresIn = 900): SesionIniciada {
  const base = sesionDe(permisos, ['ADMIN_SISTEMA'])
  return { ...base, accessToken: CIFRADO, expiresIn }
}

describe('sesión con access cifrado (FEAT-16)', () => {
  it('toma los permisos de la respuesta, no del token', () => {
    const almacen = crearAlmacenSesion()
    almacen.aceptar(sesionCifrada(['usuario.ver', 'rol.asignar']))

    const estado = almacen.estado()
    expect(estado.tipo).toBe('activa')
    if (estado.tipo === 'activa') expect(estado.permisos).toEqual(['usuario.ver', 'rol.asignar'])
  })

  it('una respuesta sin usuario.permisos se lee del token como antes', () => {
    const antigua = sesionDe(['usuario.ver'])
    const usuario = { ...antigua.usuario, permisos: undefined }
    expect(permisosDe({ ...antigua, usuario })).toEqual(['usuario.ver'])
  })

  it('calcula el vencimiento con expiresIn cuando el token no se puede leer', () => {
    vi.useFakeTimers({ now: new Date('2026-11-10T12:00:00Z') })
    try {
      const almacen = crearAlmacenSesion()
      almacen.aceptar(sesionCifrada([], 900))
      expect(almacen.tokens()?.expiraEn).toBe(Date.parse('2026-11-10T12:15:00Z'))
    } finally {
      vi.useRealTimers()
    }
  })

  it('pide el formato cifrado en login, OTP y renovación', async () => {
    const almacen = crearAlmacenSesion()
    almacen.aceptar(sesionCifrada([], 0))
    const respuesta = () => new Response(JSON.stringify(sesionCifrada([])), { status: 200 })
    const fetchSimulado = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () => respuesta())
    const api = crearApi(crearClienteHttp('https://g7.test/api/v1', almacen, fetchSimulado))

    await api.login('ana@g7.test', 'Secreta-123!')
    await api.otpVerificar('desafio', '123456')
    await api.mfaReenviar('cambio') // vence en 0 s: renueva antes de enviar

    const cuerpos = fetchSimulado.mock.calls.map(([url, init]) => [url, JSON.parse(init.body as string)])
    expect(cuerpos[0][1]).toMatchObject({ formatoAcceso: 'CIFRADO' })
    expect(cuerpos[1][1]).toMatchObject({ formatoAcceso: 'CIFRADO' })
    const refresco = cuerpos.find(([url]) => String(url).endsWith('/auth/refresh'))
    expect(refresco?.[1]).toEqual({ refreshToken: 'refresh-1', formatoAcceso: 'CIFRADO' })
  })
})
