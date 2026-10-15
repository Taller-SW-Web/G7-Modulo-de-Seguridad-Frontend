// Guards de rutas (FRONT-00 §1.4) y destino por defecto (ENTORNO-Y-REACT §3).
// Ocultar o redirigir no autoriza: el backend decide en cada endpoint.
import { Alert, Container } from '@mantine/core'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { MENSAJES } from './errores'
import { destinoPorDefecto, volverSeguro } from './navegacion'
import { useSesion } from './sesion'

export function RutaPublica({ children }: { children: ReactNode }) {
  const { estado } = useSesion()
  const { search } = useLocation()
  if (estado.tipo === 'activa') {
    const volver = volverSeguro(new URLSearchParams(search).get('volver'))
    return <Navigate to={volver ?? destinoPorDefecto(estado.permisos)} replace />
  }
  return <>{children}</>
}

export function RutaAutenticada({ children }: { children: ReactNode }) {
  const { estado } = useSesion()
  const { pathname, search } = useLocation()
  if (estado.tipo !== 'activa') {
    return <Navigate to={`/login?volver=${encodeURIComponent(pathname + search)}`} replace />
  }
  return <>{children}</>
}

/** Además de sesión, exige el permiso; sin él no se monta la pantalla (no llama al endpoint). */
export function RutaAdmin({ permiso, children }: { permiso: string; children: ReactNode }) {
  const { tienePermiso } = useSesion()
  return (
    <RutaAutenticada>
      {tienePermiso(permiso) ? (
        children
      ) : (
        <Container size="sm" py="xl">
          <Alert color="red" role="alert" title="Acceso restringido">
            {MENSAJES.permiso}
          </Alert>
        </Container>
      )}
    </RutaAutenticada>
  )
}
