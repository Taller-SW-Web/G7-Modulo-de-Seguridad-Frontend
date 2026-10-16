// Lectura de claims del access token SIN verificar la firma (FRONT-00 §1.1).
// Solo sirve para mostrar u ocultar opciones; quien autoriza es el backend.

interface ClaimsVisibles {
  permisos: string[]
  exp: number | null
}

export function leerClaims(accessToken: string): ClaimsVisibles {
  try {
    const carga = accessToken.split('.')[1]
    if (!carga) return { permisos: [], exp: null }
    const base64 = carga.replace(/-/g, '+').replace(/_/g, '/')
    const relleno = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const bytes = Uint8Array.from(atob(relleno), (c) => c.charCodeAt(0))
    const claims = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>
    const permisos = Array.isArray(claims.permisos)
      ? claims.permisos.filter((p): p is string => typeof p === 'string')
      : []
    return { permisos, exp: typeof claims.exp === 'number' ? claims.exp : null }
  } catch {
    return { permisos: [], exp: null }
  }
}
