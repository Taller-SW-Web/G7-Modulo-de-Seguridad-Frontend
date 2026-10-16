// FRONT-04 — desafío del código de un solo uso (EP-04-T005). Solo se entra desde el login
// con un desafío en memoria; el código se pide al abrir y se envía al completar 6 dígitos.
import { Alert, Anchor, Button, Center, Group, Paper, PinInput, Stack, Text, ThemeIcon, Title } from '@mantine/core'
import { IconMailCheck } from '@tabler/icons-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import type { Api } from '../../shared/api'
import { desafioActual, descartarDesafio } from '../../shared/desafio'
import { ApiError, mensajeDeError } from '../../shared/errores'
import { leerClaims } from '../../shared/jwt'
import { destinoPorDefecto, volverSeguro } from '../../shared/navegacion'
import { useSesion } from '../../shared/sesion'

type Fase = 'enviando' | 'esperando' | 'verificando' | 'agotado' | 'vencido'

function mmss(segundos: number): string {
  const s = Math.max(0, Math.ceil(segundos))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function OtpPage({ api }: { api: Api }) {
  const navegar = useNavigate()
  const { search } = useLocation()
  const { aceptarSesion } = useSesion()
  const desafio = useRef(desafioActual())
  const [fase, setFase] = useState<Fase>('enviando')
  const [destino, setDestino] = useState('')
  const [codigoVenceEn, setCodigoVenceEn] = useState(0)
  const [ahora, setAhora] = useState(() => Date.now())
  const [reenvioEn, setReenvioEn] = useState(0)
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const pedido = useRef(false)

  const volverAlLogin = useCallback(
    (mensaje: string) => {
      descartarDesafio()
      navegar('/login', { replace: true, state: { aviso: mensaje } })
    },
    [navegar],
  )

  const solicitar = useCallback(async () => {
    const actual = desafio.current
    if (!actual) return
    setFase('enviando')
    setError(null)
    setAviso(null)
    try {
      const enviado = await api.otpSolicitar(actual.challengeToken)
      const t = Date.now()
      setDestino(enviado.destinoEnmascarado)
      setCodigoVenceEn(Math.min(t + enviado.expiraEn * 1000, actual.venceEn))
      setCodigo('')
      setFase('esperando')
    } catch (e) {
      if (e instanceof ApiError && e.code === 'TOKEN_INVALIDO') {
        volverAlLogin('Tu verificación venció. Inicia sesión de nuevo.')
        return
      }
      if (e instanceof ApiError && e.status === 429) {
        setReenvioEn(Date.now() + (e.retryAfter ?? 60) * 1000)
        setAviso('Pediste varios códigos. Espera antes de pedir otro.')
      } else {
        setError(mensajeDeError(e))
      }
      setFase((f) => (f === 'enviando' && codigoVenceEn > Date.now() ? 'esperando' : 'vencido'))
    }
  }, [api, volverAlLogin, codigoVenceEn])

  useEffect(() => {
    if (!pedido.current && desafio.current) {
      pedido.current = true
      void solicitar()
    }
  }, [solicitar])

  useEffect(() => {
    const reloj = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(reloj)
  }, [])

  useEffect(() => {
    if (desafio.current && ahora >= desafio.current.venceEn) volverAlLogin('Tu verificación venció. Inicia sesión de nuevo.')
    else if (fase === 'esperando' && codigoVenceEn > 0 && ahora >= codigoVenceEn) setFase('vencido')
  }, [ahora, fase, codigoVenceEn, volverAlLogin])

  async function verificar(valor: string) {
    const actual = desafio.current
    if (!actual || fase !== 'esperando' || !/^[0-9]{6}$/.test(valor)) return
    setFase('verificando')
    setError(null)
    try {
      const sesion = await api.otpVerificar(actual.challengeToken, valor)
      descartarDesafio()
      aceptarSesion(sesion)
      const volver = volverSeguro(new URLSearchParams(search).get('volver'))
      navegar(volver ?? destinoPorDefecto(leerClaims(sesion.accessToken).permisos), { replace: true })
    } catch (e) {
      setCodigo('')
      if (e instanceof ApiError) {
        switch (e.code) {
          case 'CODIGO_INVALIDO': {
            const n = e.problem.intentosRestantes ?? 0
            setError(`El código no es correcto. Te ${n === 1 ? 'queda 1 intento' : `quedan ${n} intentos`}.`)
            setFase('esperando')
            return
          }
          case 'OTP_INTENTOS_AGOTADOS':
            setError('Agotaste los intentos. Pide un código nuevo.')
            setFase('agotado')
            return
          case 'OTP_EXPIRADO':
            setError('El código venció. Pide un código nuevo.')
            setFase('vencido')
            return
          case 'TOKEN_INVALIDO':
            volverAlLogin('Tu verificación venció. Inicia sesión de nuevo.')
            return
          case 'PASSWORD_CADUCADA':
            volverAlLogin('Tu contraseña caducó.')
            return
        }
      }
      setError(mensajeDeError(e))
      setFase('esperando')
    }
  }

  if (!desafio.current) return <Navigate to="/login" replace />

  const restante = (Math.min(codigoVenceEn || Infinity, desafio.current.venceEn) - ahora) / 1000
  const puedeReenviar = fase !== 'enviando' && fase !== 'verificando' && ahora >= reenvioEn
  const bloqueado = fase !== 'esperando'

  return (
    <Center mih="100dvh" bg="cloud.2" p="md">
      <Paper withBorder shadow="sm" p="xl" w="100%" maw={440} radius="md">
        <Stack gap="md">
          <Stack gap="xs" align="center">
            <ThemeIcon size={48} radius="xl" color="signal" aria-hidden>
              <IconMailCheck size={28} />
            </ThemeIcon>
            <Title order={1} size="h3" ta="center">
              Verifica que eres tú
            </Title>
          </Stack>

          {fase === 'enviando' && <Text ta="center">Enviando tu código…</Text>}
          {fase !== 'enviando' && destino && (
            <Text ta="center" size="sm">
              Escribe el código que enviamos a <strong>{destino}</strong>.
              {fase === 'esperando' || fase === 'verificando' ? (
                <span aria-live={restante <= 60 ? 'polite' : 'off'}> Vence en {mmss(restante)}.</span>
              ) : null}
            </Text>
          )}

          {error && (
            <Alert color="red" variant="light" role="alert">
              {error}
            </Alert>
          )}
          {aviso && (
            <Alert color="yellow" variant="light" role="status">
              {aviso}
              {ahora < reenvioEn && ` Podrás pedir otro en ${mmss((reenvioEn - ahora) / 1000)}.`}
            </Alert>
          )}
          {fase === 'vencido' && !error && (
            <Alert color="yellow" variant="light" role="status">
              El código venció. Pide un código nuevo.
            </Alert>
          )}

          <Group justify="center" role="group" aria-label="Código de verificación de 6 dígitos">
            <PinInput
              length={6}
              type="number"
              oneTimeCode
              inputMode="numeric"
              value={codigo}
              onChange={setCodigo}
              onComplete={verificar}
              disabled={bloqueado}
              getInputProps={(indice) => ({ 'aria-label': `Dígito ${indice + 1} de 6` })}
              autoFocus
            />
          </Group>

          <Button color="signal" fullWidth loading={fase === 'verificando'} disabled={bloqueado || codigo.length !== 6}
            onClick={() => verificar(codigo)}>
            Verificar
          </Button>
          <Group justify="space-between">
            <Anchor component="button" type="button" size="sm" onClick={() => volverAlLogin('')}
              >
              Volver al inicio de sesión
            </Anchor>
            <Button variant={fase === 'agotado' || fase === 'vencido' ? 'filled' : 'subtle'} size="xs"
              disabled={!puedeReenviar} onClick={solicitar}>
              Enviar otro código
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Center>
  )
}
