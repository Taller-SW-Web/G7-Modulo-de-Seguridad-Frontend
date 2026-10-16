// useSesion() (ENTORNO-Y-REACT §4): usuario y permisos para la UI, aceptarSesion,
// terminarSesion y cerrarSesion. Los tokens no salen de almacenSesion.
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import type { AlmacenSesion, EstadoSesion, MotivoFin } from './almacenSesion'
import type { Api } from './api'
import type { SesionIniciada } from './tipos'

export interface ValorSesion {
  estado: EstadoSesion
  tienePermiso(permiso: string): boolean
  aceptarSesion(sesion: SesionIniciada): void
  terminarSesion(motivo: MotivoFin): void
  /** POST /auth/logout y borrado local pase lo que pase (FRONT-00 §1.3). */
  cerrarSesion(): Promise<void>
}

const ContextoSesion = createContext<ValorSesion | null>(null)

export function ProveedorSesion({ almacen, api, children }: { almacen: AlmacenSesion; api: Api; children: ReactNode }) {
  const estado = useSyncExternalStore(almacen.suscribir, almacen.estado)

  const cerrarSesion = useCallback(async () => {
    const refresh = almacen.tokens()?.refreshToken
    almacen.terminar('cerrada')
    if (refresh) {
      try {
        await api.logout(refresh)
      } catch {
        // La sesión local ya se borró; el refresh caduca solo si el servidor no respondió.
      }
    }
  }, [almacen, api])

  const valor = useMemo<ValorSesion>(
    () => ({
      estado,
      tienePermiso: (permiso) => estado.tipo === 'activa' && estado.permisos.includes(permiso),
      aceptarSesion: (sesion) => almacen.aceptar(sesion),
      terminarSesion: (motivo) => almacen.terminar(motivo),
      cerrarSesion,
    }),
    [estado, almacen, cerrarSesion],
  )

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSesion(): ValorSesion {
  const valor = useContext(ContextoSesion)
  if (!valor) throw new Error('useSesion requiere <ProveedorSesion>')
  return valor
}
