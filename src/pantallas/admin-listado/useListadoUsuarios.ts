// FRONT-07: filtros en la URL y GET /usuarios con cancelación de la consulta anterior.
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { Api, FiltrosUsuarios } from '../../shared/api'
import { CODIGOS_ROL, ESTADOS_CUENTA, type CodigoRol, type EstadoCuenta, type PaginaUsuarios } from '../../shared/tipos'

export const TAMANO_POR_DEFECTO = 20

function entero(valor: string | null, porDefecto: number, max: number): number {
  const n = valor === null ? NaN : Number(valor)
  return Number.isInteger(n) && n >= 1 ? Math.min(n, max) : porDefecto
}

/** Solo valores del contrato: lo demás de la URL se ignora. */
export function filtrosDesdeUrl(params: URLSearchParams): Required<Pick<FiltrosUsuarios, 'pagina' | 'tamano'>> &
  FiltrosUsuarios {
  const estado = params.get('estado')
  const rol = params.get('rol')
  const correo = params.get('correo')?.trim()
  return {
    estado: ESTADOS_CUENTA.includes(estado as EstadoCuenta) ? (estado as EstadoCuenta) : undefined,
    rol: CODIGOS_ROL.includes(rol as CodigoRol) ? (rol as CodigoRol) : undefined,
    correo: correo || undefined,
    pagina: entero(params.get('pagina'), 1, Number.MAX_SAFE_INTEGER),
    tamano: entero(params.get('tamano'), TAMANO_POR_DEFECTO, 100),
  }
}

type Carga = { tipo: 'cargando' } | { tipo: 'listo'; pagina: PaginaUsuarios } | { tipo: 'error'; error: unknown }

export function useListadoUsuarios(api: Api) {
  const [params, setParams] = useSearchParams()
  const filtros = filtrosDesdeUrl(params)
  const clave = JSON.stringify(filtros)
  const [carga, setCarga] = useState<Carga>({ tipo: 'cargando' })
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    const control = new AbortController()
    setCarga({ tipo: 'cargando' })
    api
      .listarUsuarios(JSON.parse(clave) as FiltrosUsuarios, control.signal)
      .then((pagina) => setCarga({ tipo: 'listo', pagina }))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setCarga({ tipo: 'error', error })
      })
    return () => control.abort()
  }, [api, clave, intento])

  /** Cambiar un filtro vuelve a la página 1; `undefined` lo quita de la URL. */
  const cambiar = useCallback(
    (cambios: Partial<FiltrosUsuarios>) => {
      setParams((actuales) => {
        const nuevos = new URLSearchParams(actuales)
        for (const [clave, valor] of Object.entries(cambios)) {
          if (valor === undefined || valor === '') nuevos.delete(clave)
          else nuevos.set(clave, String(valor))
        }
        if (!('pagina' in cambios)) nuevos.delete('pagina')
        return nuevos
      })
    },
    [setParams],
  )

  const quitarFiltros = useCallback(() => setParams(new URLSearchParams()), [setParams])
  const reintentar = useCallback(() => setIntento((n) => n + 1), [])

  return { filtros, carga, cambiar, quitarFiltros, reintentar }
}
