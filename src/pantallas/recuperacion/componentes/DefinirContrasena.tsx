import { Alert, Anchor, Button, PasswordInput, Stack } from '@mantine/core'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { MedidorPassword } from '../../../componentes/MedidorPassword'
import type { Api } from '../../../shared/api'
import { ApiError, mensajeDeError } from '../../../shared/errores'
import { useSesion } from '../../../shared/sesion'
import type { PoliticaPassword } from '../../../shared/tipos'

export function DefinirContrasena({ api, token, onPedirEnlace }: { api: Api; token: string; onPedirEnlace: () => void }) {
  const navegar = useNavigate()
  const { terminarSesion } = useSesion()
  const [politica, setPolitica] = useState<PoliticaPassword | null>(null)
  const [nueva, setNueva] = useState('')
  const [repetir, setRepetir] = useState('')
  const [errorNueva, setErrorNueva] = useState<string | null>(null)
  const [errorRepetir, setErrorRepetir] = useState<string | null>(null)
  const [rechazadas, setRechazadas] = useState<ReadonlySet<string>>(new Set())
  const [general, setGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [enlaceFinal, setEnlaceFinal] = useState<'invalido' | 'vencido' | null>(null)

  useEffect(() => {
    const control = new AbortController()
    api.politicaPassword(control.signal).then(setPolitica).catch(() => setPolitica(null))
    return () => control.abort()
  }, [api])

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setGeneral(null)
    const errores = { nueva: !nueva ? 'Escribe la nueva contraseña.' : '', repetir: repetir !== nueva ? 'Las contraseñas no coinciden.' : '' }
    setErrorNueva(errores.nueva || null)
    setErrorRepetir(errores.repetir || null)
    if (errores.nueva || errores.repetir || enviando) return
    setEnviando(true)
    try {
      await api.restablecerContrasena(token, nueva)
      terminarSesion('cerrada')
      navegar('/login', { replace: true, state: { aviso: 'Tu contraseña se actualizó. Ya puedes iniciar sesión.' } })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'POLITICA_INCUMPLIDA') {
        setRechazadas(new Set((error.problem.errores ?? []).map((item) => item.regla ?? '').filter(Boolean)))
        setErrorNueva('La contraseña nueva no cumple las reglas marcadas.')
      } else if (error instanceof ApiError && (error.code === 'TOKEN_RECUPERACION_INVALIDO' || error.status === 401)) {
        setEnlaceFinal('invalido')
      } else if (error instanceof ApiError && (error.code === 'TOKEN_RECUPERACION_EXPIRADO' || error.status === 410)) {
        setEnlaceFinal('vencido')
      } else {
        setGeneral(mensajeDeError(error))
      }
    } finally {
      setEnviando(false)
    }
  }

  if (enlaceFinal) {
    return (
      <Stack gap="md">
        <Alert color="yellow" role="alert">
          {enlaceFinal === 'vencido'
            ? 'Este enlace venció: los enlaces para restablecer la contraseña duran 30 minutos.'
            : 'Este enlace ya no es válido. Puede que ya lo hayas usado o que hayas pedido otro más reciente.'}
        </Alert>
        <Button type="button" onClick={onPedirEnlace}>Pedir un enlace nuevo</Button>
      </Stack>
    )
  }

  return (
    <form onSubmit={enviar} noValidate>
      <Stack gap="md">
        {general && <Alert color="red" role="alert">{general}</Alert>}
        <PasswordInput
          label="Contraseña nueva"
          autoComplete="new-password"
          value={nueva}
          onChange={(evento) => { setNueva(evento.currentTarget.value); setRechazadas(new Set()) }}
          error={errorNueva}
          required
        />
        <MedidorPassword politica={politica} valor={nueva} rechazadas={rechazadas} />
        <PasswordInput
          label="Repite la contraseña"
          autoComplete="new-password"
          value={repetir}
          onChange={(evento) => setRepetir(evento.currentTarget.value)}
          error={errorRepetir}
          required
        />
        <Button type="submit" color="signal" loading={enviando} disabled={enviando}>
          {enviando ? 'Guardando…' : 'Guardar contraseña'}
        </Button>
        <Anchor component="button" type="button" onClick={onPedirEnlace} size="sm">
          Pedir un enlace nuevo
        </Anchor>
      </Stack>
    </form>
  )
}
