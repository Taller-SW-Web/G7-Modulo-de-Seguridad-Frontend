import { describe, expect, it, vi } from 'vitest'
import { crearApi } from './api'
import { crearAlmacenSesion } from './almacenSesion'
import { crearClienteHttp } from './http'
import { sesionDe } from '../test/renderizar'

describe('consumo v2 con cliente compartido', () => {
  it('las tres mutaciones MFA usan v2 y no renuevan ni repiten TOKEN_INVALIDO', async () => {
    const almacen = crearAlmacenSesion(); almacen.aceptar(sesionDe([]))
    const fetchSimulado = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ code: 'TOKEN_INVALIDO' }), { status: 401 })))
    const api = crearApi(crearClienteHttp('https://g7.test/api/v1', almacen, fetchSimulado))
    await expect(api.mfaSolicitar('HABILITAR')).rejects.toMatchObject({ code: 'TOKEN_INVALIDO' })
    await expect(api.mfaReenviar('cambio-test')).rejects.toMatchObject({ code: 'TOKEN_INVALIDO' })
    await expect(api.mfaConfirmar('cambio-test', '012345')).rejects.toMatchObject({ code: 'TOKEN_INVALIDO' })
    expect(fetchSimulado).toHaveBeenCalledTimes(3)
    expect(fetchSimulado.mock.calls.map((c) => c[0])).toEqual([
      'https://g7.test/api/v2/auth/mfa/cambios', 'https://g7.test/api/v2/auth/mfa/cambios/reenviar',
      'https://g7.test/api/v2/auth/mfa/cambios/confirmar',
    ])
    expect(fetchSimulado.mock.calls[2][1].body).toBe(JSON.stringify({ mfaChangeToken: 'cambio-test', codigo: '012345' }))
  })
})
