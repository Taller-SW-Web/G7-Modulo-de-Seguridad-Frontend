import { describe, expect, it, vi } from 'vitest'
import { crearApi } from './api'

describe('API bloqueo manual', () => {
  it('usa v1, cuerpo publicado y evita repetir la mutación', async () => {
    const request = vi.fn().mockResolvedValue(undefined)
    const api = crearApi({ request })
    await api.bloquearUsuario('cuenta/1', 'Revisión')
    expect(request).toHaveBeenLastCalledWith('/usuarios/cuenta%2F1/bloquear', {
      method: 'POST', body: { motivo: 'Revisión' }, renovarAntesDeEnviar: true, renovarAnteTokenInvalido: false,
    })
    await api.desbloquearUsuario('cuenta/1')
    expect(request).toHaveBeenLastCalledWith('/usuarios/cuenta%2F1/desbloquear', {
      method: 'POST', renovarAntesDeEnviar: true, renovarAnteTokenInvalido: false,
    })
  })
})
