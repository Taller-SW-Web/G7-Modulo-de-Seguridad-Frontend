import { describe, expect, it, vi } from 'vitest'
import { crearApi } from './api'
import type { ClienteHttp } from './http'

describe('api.solicitarRecuperacion', () => {
  it('envía el canal solicitado cuando viene de otro canal', async () => {
    const request = vi.fn().mockResolvedValue(undefined)

    await crearApi({ request } as unknown as ClienteHttp)
      .solicitarRecuperacion('persona@g7.test', 'MARKETPLACE')

    expect(request).toHaveBeenCalledWith('/password/recuperar', {
      method: 'POST',
      body: { correo: 'persona@g7.test', canalOrigen: 'MARKETPLACE' },
      autenticada: false,
    })
  })

  it('omite canalOrigen para WEB y conserva el valor predeterminado del contrato', async () => {
    const request = vi.fn().mockResolvedValue(undefined)

    await crearApi({ request } as unknown as ClienteHttp).solicitarRecuperacion('persona@g7.test')

    expect(request).toHaveBeenCalledWith('/password/recuperar', {
      method: 'POST',
      body: { correo: 'persona@g7.test' },
      autenticada: false,
    })
  })
})
