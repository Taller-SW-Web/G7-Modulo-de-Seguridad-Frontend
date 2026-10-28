// FRONT-03 — Verificación de correo (SPEC-02, FEAT-01-T5). Dos entradas: tras registrarse (correo en
// memoria) o desde el enlace del correo (token y canal en la URL, que se quitan al cargar, FRONT-00 §1.5).
// Tras verificar, «Iniciar sesión» lleva al login del canal solo si su URL está en la lista del entorno.
import { Alert, Anchor, Button, Center, Loader, Paper, Stack, Text, TextInput, Title } from '@mantine/core'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import type { Api } from '../../shared/api'
import { enmascararCorreo } from '../../shared/enmascararCorreo'
import { ApiError, mensajeDeError } from '../../shared/errores'
import { canalDelEnlace, retornoDelCanal, type CanalOrigen } from '../../shared/retornoCanal'
import { useSesion } from '../../shared/sesion'

type Estado = 'espera' | 'reenvio' | 'verificando' | 'verificado' | 'vencido' | 'ya-usado' | 'fallo'

const TEXTOS = {
  verificado: 'Tu correo quedó verificado.',
  vencido: 'Este enlace venció: los enlaces de verificación duran 24 horas. Pide uno nuevo.',
  yaUsado: 'Este enlace ya se usó. Si ya verificaste tu correo, puedes iniciar sesión.',
  reenvioAceptado:
    'Si hay una cuenta pendiente de verificar con ese correo, te enviamos un enlace nuevo. El anterior deja de funcionar.',
  limitado: 'Ya pediste varios enlaces en la última hora. Espera un rato antes de pedir otro.',
  avisoLogin: 'Tu correo quedó verificado. Ya puedes iniciar sesión.',
} as const

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface Llegada {
  token: string | null
  canal: CanalOrigen
  correo: string
}

/** Lee la URL una sola vez: el token y el canal solo quedan en memoria. */
function leerLlegada(search: string, state: unknown): Llegada {
  const parametros = new URLSearchParams(search)
  const token = parametros.has('token') ? (parametros.get('token') ?? '').trim() : null
  const correo = (state as { correo?: unknown } | null)?.correo
  return { token, canal: canalDelEnlace(parametros.get('canal')), correo: typeof correo === 'string' ? correo : '' }
}

export function VerificacionCorreoPage({ api }: { api: Api }) {
  const location = useLocation()
  const navegar = useNavigate()
  const { estado: sesion } = useSesion()
  const [llegada] = useState(() => leerLlegada(location.search, location.state))
  const [estado, setEstado] = useState<Estado>(() => {
    if (llegada.token === null) return llegada.correo ? 'espera' : 'reenvio'
    return llegada.token ? 'verificando' : 'vencido' // enlace incompleto: como vencido, sin llamar
  })
  const [fallo, setFallo] = useState('')
  const verificacionIniciada = useRef(false)
  const titulo = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (!new URLSearchParams(location.search).has('token') && !new URLSearchParams(location.search).has('canal')) return
    navegar({ pathname: location.pathname, hash: location.hash }, { replace: true, state: location.state })
  }, [location.hash, location.pathname, location.search, location.state, navegar])

  async function verificar(token: string) {
    setEstado('verificando')
    try {
      await api.verificarCorreo(token)
      setEstado('verificado')
    } catch (error) {
      if (error instanceof ApiError && error.code === 'ENLACE_EXPIRADO') setEstado('vencido')
      else if (error instanceof ApiError && (error.code === 'ENLACE_YA_USADO' || error.status === 410)) setEstado('ya-usado')
      else {
        setFallo(mensajeDeError(error))
        setEstado('fallo')
      }
    }
  }

  useEffect(() => {
    // Una sola vez aunque React monte dos veces en desarrollo: el token es de un solo uso.
    if (!llegada.token || verificacionIniciada.current) return
    verificacionIniciada.current = true
    void verificar(llegada.token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (estado !== 'verificando') titulo.current?.focus()
  }, [estado])

  const destino = sesion.tipo === 'activa' ? null : retornoDelCanal(llegada.canal)
  const iniciarSesion: ReactNode =
    sesion.tipo === 'activa' ? (
      <Button component={Link} to="/mi-cuenta" color="signal">Ir a Mi cuenta</Button>
    ) : destino ? (
      <Button component="a" href={destino} rel="noreferrer" color="signal">Iniciar sesión</Button>
    ) : (
      <Button component={Link} to="/login" state={{ aviso: TEXTOS.avisoLogin }} color="signal">Iniciar sesión</Button>
    )

  const titulos: Record<Estado, string> = {
    espera: 'Revisa tu correo',
    reenvio: 'Verifica tu correo',
    verificando: 'Verificando tu correo',
    verificado: 'Correo verificado',
    vencido: 'El enlace venció',
    'ya-usado': 'El enlace ya se usó',
    fallo: 'No pudimos verificar tu correo',
  }

  return (
    <Center mih="100dvh" bg="cloud.2" p="md">
      <Paper withBorder shadow="sm" p="xl" w="100%" maw={440} radius="md">
        <Stack gap="md" aria-live="polite">
          <Title ref={titulo} tabIndex={-1} order={1} size="h3">{titulos[estado]}</Title>

          {estado === 'verificando' && (
            <Stack align="center" gap="xs">
              <Loader size="sm" aria-hidden />
              <Text>Estamos verificando tu correo…</Text>
            </Stack>
          )}

          {estado === 'verificado' && (
            <>
              <Alert color="green" variant="light">{TEXTOS.verificado}</Alert>
              {iniciarSesion}
            </>
          )}

          {estado === 'vencido' && (
            <>
              <Alert color="yellow" variant="light">{TEXTOS.vencido}</Alert>
              <Reenvio api={api} correoInicial="" />
            </>
          )}

          {estado === 'ya-usado' && (
            <>
              <Alert color="yellow" variant="light">{TEXTOS.yaUsado}</Alert>
              {iniciarSesion}
              <Reenvio api={api} correoInicial="" />
            </>
          )}

          {estado === 'fallo' && (
            <>
              <Alert color="red" variant="light" role="alert">{fallo}</Alert>
              {llegada.token && (
                <Button variant="default" onClick={() => void verificar(llegada.token!)}>Intentar de nuevo</Button>
              )}
            </>
          )}

          {estado === 'espera' && (
            <>
              <Text>
                Te enviamos un enlace a <span aria-label={`correo terminado en ${llegada.correo.split('@')[1] ?? ''}`}>
                  {enmascararCorreo(llegada.correo)}</span>.
              </Text>
              <Text size="sm" c="dimmed">Vence en 24 horas. Si no lo ves, revisa la carpeta de spam.</Text>
              <Reenvio api={api} correoInicial={llegada.correo} soloBoton />
            </>
          )}

          {estado === 'reenvio' && <Reenvio api={api} correoInicial="" />}

          <Anchor component={Link} to="/login" size="sm">Volver a iniciar sesión</Anchor>
        </Stack>
      </Paper>
    </Center>
  )
}

/** Reenvío del enlace (RF-02.4): el 202 nunca confirma que la cuenta exista. */
function Reenvio({ api, correoInicial, soloBoton = false }: { api: Api; correoInicial: string; soloBoton?: boolean }) {
  const [correo, setCorreo] = useState(correoInicial)
  const [errorCampo, setErrorCampo] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<{ tipo: 'aceptado' | 'error'; texto: string } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [limitado, setLimitado] = useState(false)

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setMensaje(null)
    const limpio = correo.trim()
    if (!CORREO_VALIDO.test(limpio)) {
      setErrorCampo('Escribe un correo válido, como nombre@dominio.com.')
      return
    }
    setErrorCampo(null)
    setEnviando(true)
    try {
      await api.reenviarVerificacion(limpio)
      setMensaje({ tipo: 'aceptado', texto: TEXTOS.reenvioAceptado })
    } catch (error) {
      if (error instanceof ApiError && (error.code === 'DEMASIADAS_SOLICITUDES' || error.status === 429)) {
        setLimitado(true)
        setMensaje({ tipo: 'error', texto: TEXTOS.limitado })
      } else {
        setMensaje({ tipo: 'error', texto: mensajeDeError(error) })
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} noValidate>
      <Stack gap="sm">
        {mensaje && (
          <Alert color={mensaje.tipo === 'aceptado' ? 'blue' : 'red'} variant="light"
            role={mensaje.tipo === 'aceptado' ? 'status' : 'alert'}>
            {mensaje.texto}
          </Alert>
        )}
        {!soloBoton && (
          <TextInput
            label="Correo" type="email" autoComplete="email" required value={correo}
            onChange={(e) => setCorreo(e.currentTarget.value)} error={errorCampo}
          />
        )}
        <Button type="submit" variant={soloBoton ? 'default' : 'filled'} color="signal"
          loading={enviando} disabled={enviando || limitado}>
          {enviando ? 'Enviando…' : soloBoton ? 'Reenviar enlace' : 'Enviar un enlace nuevo'}
        </Button>
      </Stack>
    </form>
  )
}
