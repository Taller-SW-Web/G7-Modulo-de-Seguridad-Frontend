import { describe, expect, it, vi } from 'vitest'
import { crearAlmacenSesion } from './almacenSesion'
import { ApiError, RedError } from './errores'
import { crearClienteHttp } from './http'
import type { SesionIniciada } from './tipos'

const BASE = 'https://g7.test/api/v1'

function token(permisos: string[], marca: string): string {
  const carga = btoa(JSON.stringify({ sub: 'u-1', permisos, exp: 2_000_000_000, marca }))
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  return `eyJhbGciOiJSUzI1NiJ9.${carga}.firma`
}

function sesion(marca: string): SesionIniciada {
  return {
    accessToken: token(['usuario.ver'], marca),
    refreshToken: `refresh-${marca}`,
    tokenType: 'Bearer',
    expiresIn: 900,
    usuario: { id: 'u-1', nombreCompleto: 'Ada', correo: 'ada@g7.test', roles: ['ADMIN_SISTEMA'] },
  }
}

function json(status: number, cuerpo: unknown, cabeceras: Record<string, string> = {}): Response {
  return new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json', ...cabeceras },
  })
}

const tokenInvalido = () => json(401, { code: 'TOKEN_INVALIDO', status: 401 })

describe('cliente HTTP', () => {
  it('envía el Bearer de la sesión y nunca usa almacenamiento del navegador', async () => {
    const almacen = crearAlmacenSesion()
    almacen.aceptar(sesion('a'))
    const fetchSimulado = vi.fn().mockResolvedValue(json(200, { ok: true }))
    const guardar = vi.spyOn(Storage.prototype, 'setItem')

    await crearClienteHttp(BASE, almacen, fetchSimulado).request('/usuarios')

    const [url, init] = fetchSimulado.mock.calls[0]
    expect(url).toBe(`${BASE}/usuarios`)
    expect(init.headers.Authorization).toBe(`Bearer ${sesion('a').accessToken}`)
    expect(init.credentials).toBe('omit')
    expect(guardar).not.toHaveBeenCalled()
    expect(document.cookie).toBe('')
  })

  it('no envía token en las rutas públicas', async () => {
    const almacen = crearAlmacenSesion()
    almacen.aceptar(sesion('a'))
    const fetchSimulado = vi.fn().mockResolvedValue(json(200, {}))
    await crearClienteHttp(BASE, almacen, fetchSimulado).request('/auth/login', {
      method: 'POST',
      body: {},
      autenticada: false,
    })
    expect(fetchSimulado.mock.calls[0][1].headers.Authorization).toBeUndefined()
  })

  it('convierte el ProblemDetail en ApiError con su code y Retry-After', async () => {
    const fetchSimulado = vi
      .fn()
      .mockResolvedValue(json(429, { code: 'DEMASIADAS_SOLICITUDES', detail: 'x' }, { 'Retry-After': '30' }))
    const error = await crearClienteHttp(BASE, crearAlmacenSesion(), fetchSimulado)
      .request('/x', { autenticada: false })
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).code).toBe('DEMASIADAS_SOLICITUDES')
    expect((error as ApiError).retryAfter).toBe(30)
  })

  it('sin red lanza RedError y no reintenta', async () => {
    const fetchSimulado = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(crearClienteHttp(BASE, crearAlmacenSesion(), fetchSimulado).request('/x')).rejects.toBeInstanceOf(
      RedError,
    )
    expect(fetchSimulado).toHaveBeenCalledTimes(1)
  })

  it('ante TOKEN_INVALIDO renueva una sola vez para varias peticiones y repite cada una una vez', async () => {
    const almacen = crearAlmacenSesion()
    almacen.aceptar(sesion('vieja'))
    const nueva = sesion('nueva')
    let refrescos = 0
    const fetchSimulado = vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith('/auth/refresh')) {
        refrescos++
        expect(JSON.parse(init.body as string)).toEqual({ refreshToken: 'refresh-vieja' })
        await new Promise((r) => setTimeout(r, 5))
        return json(200, nueva)
      }
      const bearer = (init.headers as Record<string, string>).Authorization
      return bearer === `Bearer ${nueva.accessToken}` ? json(200, { url }) : tokenInvalido()
    })
    const cliente = crearClienteHttp(BASE, almacen, fetchSimulado)

    const [a, b] = await Promise.all([cliente.request('/a'), cliente.request('/b')])

    expect(a).toEqual({ url: `${BASE}/a` })
    expect(b).toEqual({ url: `${BASE}/b` })
    expect(refrescos).toBe(1)
    expect(almacen.tokens()).toEqual({ accessToken: nueva.accessToken, refreshToken: nueva.refreshToken })
    expect(fetchSimulado).toHaveBeenCalledTimes(5) // 2 originales + 1 refresh + 2 repeticiones
  })

  it('si el token sigue inválido tras renovar no entra en bucle', async () => {
    const almacen = crearAlmacenSesion()
    almacen.aceptar(sesion('a'))
    const fetchSimulado = vi.fn(async (url: string) =>
      url.endsWith('/auth/refresh') ? json(200, sesion('b')) : tokenInvalido(),
    )
    await expect(crearClienteHttp(BASE, almacen, fetchSimulado).request('/x')).rejects.toBeInstanceOf(ApiError)
    expect(fetchSimulado).toHaveBeenCalledTimes(3)
  })

  it('refresh rechazado termina la sesión como vencida', async () => {
    const almacen = crearAlmacenSesion()
    almacen.aceptar(sesion('a'))
    const fetchSimulado = vi.fn(async (url: string) =>
      url.endsWith('/auth/refresh') ? json(401, { code: 'REFRESCO_INVALIDO' }) : tokenInvalido(),
    )
    await expect(crearClienteHttp(BASE, almacen, fetchSimulado).request('/x')).rejects.toBeInstanceOf(ApiError)
    expect(almacen.estado()).toEqual({ tipo: 'sin-sesion', motivo: 'vencida' })
    expect(almacen.tokens()).toBeNull()
  })

  it('otros 401 (credenciales, código) no disparan renovación', async () => {
    const almacen = crearAlmacenSesion()
    almacen.aceptar(sesion('a'))
    const fetchSimulado = vi.fn().mockResolvedValue(json(401, { code: 'CREDENCIALES_INVALIDAS' }))
    await expect(crearClienteHttp(BASE, almacen, fetchSimulado).request('/x')).rejects.toMatchObject({
      code: 'CREDENCIALES_INVALIDAS',
    })
    expect(fetchSimulado).toHaveBeenCalledTimes(1)
  })

  it('una renovación que termina después de cerrar sesión no la restaura', async () => {
    const almacen = crearAlmacenSesion()
    almacen.aceptar(sesion('a'))
    let liberar: () => void = () => {}
    const fetchSimulado = vi.fn(async (url: string) => {
      if (url.endsWith('/auth/refresh')) {
        await new Promise<void>((r) => (liberar = r))
        return json(200, sesion('b'))
      }
      return tokenInvalido()
    })
    const pendiente = crearClienteHttp(BASE, almacen, fetchSimulado).request('/x').catch((e: unknown) => e)
    await vi.waitFor(() => expect(fetchSimulado).toHaveBeenCalledTimes(2))
    almacen.terminar('cerrada')
    liberar()
    await pendiente
    expect(almacen.estado().tipo).toBe('sin-sesion')
    expect(almacen.tokens()).toBeNull()
  })
})
