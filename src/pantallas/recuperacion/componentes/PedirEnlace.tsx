import { Alert, Button, TextInput } from '@mantine/core'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Api } from '../../../shared/api'
import { ApiError, mensajeDeError } from '../../../shared/errores'

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function PedirEnlace({ api, correoInicial, enfocarEnviar }: {
  api: Api
  correoInicial: string
  enfocarEnviar: boolean
}) {
  const [correo, setCorreo] = useState(correoInicial)
  const [errorCampo, setErrorCampo] = useState<string | null>(null)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [limitado, setLimitado] = useState(false)
  const boton = useRef<HTMLButtonElement>(null)
  const confirmacion = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (enfocarEnviar) boton.current?.focus()
  }, [enfocarEnviar])
  useEffect(() => {
    if (enviado) confirmacion.current?.focus()
  }, [enviado])

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setErrorGeneral(null)
    const limpio = correo.trim()
    if (!CORREO_VALIDO.test(limpio)) {
      setErrorCampo('Escribe un correo válido, como nombre@dominio.com.')
      return
    }
    setErrorCampo(null)
    setEnviando(true)
    try {
      await api.solicitarRecuperacion(limpio)
      setCorreo(limpio)
      setEnviado(true)
    } catch (error) {
      if (error instanceof ApiError && (error.status === 429 || error.code === 'DEMASIADAS_SOLICITUDES')) {
        setLimitado(true)
        setErrorGeneral('Ya pediste varios enlaces seguidos. Espera unos minutos antes de pedir otro.')
      } else {
        setErrorGeneral(mensajeDeError(error))
      }
    } finally {
      setEnviando(false)
    }
  }

  if (enviado) {
    return (
      <Alert ref={confirmacion} tabIndex={-1} color="blue" variant="light" role="status">
        Si el correo {correo} corresponde a una cuenta, te enviamos un enlace para crear una contraseña nueva. Vence en 30 minutos. Si pides otro, este dejará de funcionar.
      </Alert>
    )
  }

  return (
    <form onSubmit={enviar} noValidate>
      {errorGeneral && <Alert color="red" variant="light" role="alert" mb="md">{errorGeneral}</Alert>}
      <TextInput
        label="Correo"
        type="email"
        autoComplete="email"
        value={correo}
        onChange={(evento) => setCorreo(evento.currentTarget.value)}
        error={errorCampo}
        required
      />
      <Button ref={boton} type="submit" color="signal" fullWidth mt="md" loading={enviando} disabled={enviando || limitado}>
        {enviando ? 'Enviando…' : 'Enviar enlace'}
      </Button>
    </form>
  )
}
