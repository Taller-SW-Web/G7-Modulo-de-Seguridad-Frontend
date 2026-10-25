// FEAT-04-T4: contrato de POST /usuarios/{id}/correo desde el cliente (OpenAPI solicitarCambioCorreo).
import { describe, expect, it, vi } from 'vitest'
import { crearAlmacenSesion } from './almacenSesion'
import { crearApi } from './api'
import { ApiError } from './errores'
import { crearClienteHttp } from './http'
import type { SesionIniciada } from './tipos'

const BASE = 'https://g7.test/api/v1'

function sesion(): SesionIniciada {
  const carga = btoa(JSON.stringify({ sub: 'u-1', permisos: [], exp: 2_000_000_000 })).replace(/=+$/, '')
  return {
    accessToken: `eyJhbGciOiJSUzI1NiJ9.${carga}.firma`,
    refreshToken: 'refresh-1',
    tokenType: 'Bearer',
    expiresIn: 900,
    usuario: { id: 'u-1', nombreCompleto: 'Ana', correo: 'ana@g7.test', roles: ['CLIENTE'] },
  }
}

describe('api.solicitarCambioCorreo', () => {
  it('hace POST con nuevoCorreo y contrasenaActual, escapa el id y acepta el 202 sin cuerpo', async () => {
    const request = vi.fn().mockResolvedValue(undefined)
    await crearApi({ request }).solicitarCambioCorreo('a b/c', 'nuevo@g7.test', 'Clave-1')
    expect(request).toHaveBeenCalledWith('/usuarios/a%20b%2Fc/correo', {
      method: 'POST',
      body: { nuevoCorreo: 'nuevo@g7.test', contrasenaActual: 'Clave-1' },
    })
  })

  it('un 202 sin cuerpo se resuelve y no toca la sesión', async () => {
    const almacen = crearAlmacenSesion()
    almacen.aceptar(sesion())
    const fetchSimulado = vi.fn().mockResolvedValue(new Response(null, { status: 202 }))
    const api = crearApi(crearClienteHttp(BASE, almacen, fetchSimulado))
    await expect(api.solicitarCambioCorreo('u-1', 'nuevo@g7.test', 'Clave-1')).resolves.toBeUndefined()
    const [url, init] = fetchSimulado.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${BASE}/usuarios/u-1/correo`)
    expect(JSON.parse(init.body as string)).toEqual({ nuevoCorreo: 'nuevo@g7.test', contrasenaActual: 'Clave-1' })
  })

  it('401 CREDENCIALES_INVALIDAS no renueva ni cierra la sesión (solo TOKEN_INVALIDO renueva)', async () => {
    const almacen = crearAlmacenSesion()
    almacen.aceptar(sesion())
    const fetchSimulado = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'CREDENCIALES_INVALIDAS', status: 401 }), {
        status: 401,
        headers: { 'Content-Type': 'application/problem+json' },
      }),
    )
    const api = crearApi(crearClienteHttp(BASE, almacen, fetchSimulado))
    const error = await api.solicitarCambioCorreo('u-1', 'nuevo@g7.test', 'mala').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).code).toBe('CREDENCIALES_INVALIDAS')
    expect(fetchSimulado).toHaveBeenCalledTimes(1)
    expect(almacen.tokens()).not.toBeNull()
  })
})
