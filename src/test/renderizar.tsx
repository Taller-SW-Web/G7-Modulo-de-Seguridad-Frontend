// Monta la SPA real (rutas, sesión, tema) sobre un API simulado, en una ruta inicial.
import { MantineProvider } from '@mantine/core'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { Rutas } from '../App'
import { crearAlmacenSesion, type AlmacenSesion } from '../shared/almacenSesion'
import type { Api } from '../shared/api'
import { ProveedorSesion } from '../shared/sesion'
import { tema } from '../shared/tema'
import type { SesionIniciada } from '../shared/tipos'

export function tokenCon(permisos: string[]): string {
  const carga = btoa(JSON.stringify({ sub: 'u-1', permisos })).replace(/=+$/, '')
  return `eyJhbGciOiJSUzI1NiJ9.${carga}.firma`
}

export function sesionDe(permisos: string[], roles: SesionIniciada['usuario']['roles'] = ['CLIENTE']): SesionIniciada {
  return {
    accessToken: tokenCon(permisos),
    refreshToken: 'refresh-1',
    tokenType: 'Bearer',
    expiresIn: 900,
    usuario: { id: '00000000-0000-4000-8000-00000000f00a', nombreCompleto: 'Ana Prueba', correo: 'ana@g7.test', roles },
  }
}

export function renderizar(api: Partial<Api>, ruta: string, almacen: AlmacenSesion = crearAlmacenSesion()) {
  const resultado = render(
    <MantineProvider theme={tema}>
      <ProveedorSesion almacen={almacen} api={api as Api}>
        <MemoryRouter initialEntries={[ruta]}>
          <Rutas api={api as Api} />
        </MemoryRouter>
      </ProveedorSesion>
    </MantineProvider>,
  )
  return { ...resultado, almacen }
}
