// Activación de una cuenta creada por otra persona (SPEC-03 RF-03.3 y RF-03.5, issue #36; FEAT-13-T2).
// Llega con el token del enlace del correo, que se quita de la URL al cargar (FRONT-00 §1.5). El titular
// define su contraseña con la política de SPEC-07 y acepta los términos; nadie más llegó a conocerla.
import { Alert, Anchor, Button, Checkbox, Container, Paper, PasswordInput, Stack, Text, Title } from '@mantine/core'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { MedidorPassword } from '../../componentes/MedidorPassword'
import type { Api } from '../../shared/api'
import { EnlaceTerminos } from '../terminos/EnlaceTerminos'
import { enmascararCorreo } from '../../shared/enmascararCorreo'
import { ApiError, mensajeDeError } from '../../shared/errores'
import { useSesion } from '../../shared/sesion'
import type { PoliticaPassword } from '../../shared/tipos'

export const TEXTOS_ACTIVACION = {
  activada: 'Tu cuenta quedó activa. Ya puedes iniciar sesión.',
  // El alta con el mismo correo responde 409 mientras el PO decide si reenvía el enlace (revisión de Luis en #28).
  vencido: 'Este enlace venció: los enlaces de activación duran 72 horas. Contacta al administrador de la plataforma para revisar tu activación.',
  yaUsado: 'Este enlace ya se usó. Si ya activaste tu cuenta, inicia sesión.',
  incompleto: 'El enlace está incompleto. Ábrelo de nuevo desde el correo que recibiste.',
  terminos: 'Debes aceptar los términos y el tratamiento de tus datos personales para activar tu cuenta.',
  otraSesion: 'En este navegador hay otra sesión abierta. Ciérrala para entrar con la cuenta que acabas de activar.',
} as const

type Final = 'activada' | 'vencido' | 'ya-usado'

export function ActivacionCuentaPage({ api }: { api: Api }) {
  const location = useLocation()
  const navegar = useNavigate()
  const { estado: sesion, cerrarSesion } = useSesion()
  const [token] = useState(() => new URLSearchParams(location.search).get('token')?.trim() ?? '')
  const [politica, setPolitica] = useState<PoliticaPassword | null>(null)
  const [contrasena, setContrasena] = useState('')
  const [repetir, setRepetir] = useState('')
  const [acepta, setAcepta] = useState(false)
  const [errorContrasena, setErrorContrasena] = useState<string | null>(null)
  const [errorRepetir, setErrorRepetir] = useState<string | null>(null)
  const [errorTerminos, setErrorTerminos] = useState<string | null>(null)
  const [rechazadas, setRechazadas] = useState<ReadonlySet<string>>(new Set())
  const [general, setGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [final, setFinal] = useState<Final | null>(null)

  // El token solo queda en memoria: se quita de la barra de direcciones y del historial.
  useEffect(() => {
    if (!new URLSearchParams(location.search).has('token')) return
    navegar({ pathname: location.pathname, hash: location.hash }, { replace: true, state: location.state })
  }, [location.hash, location.pathname, location.search, location.state, navegar])

  useEffect(() => {
    const control = new AbortController()
    api.politicaPassword(control.signal).then(setPolitica).catch(() => setPolitica(null))
    return () => control.abort()
  }, [api])

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (enviando) return
    setGeneral(null)
    const faltaContrasena = contrasena ? null : 'Escribe tu contraseña.'
    const noCoinciden = repetir !== contrasena ? 'Las contraseñas no coinciden.' : null
    const sinTerminos = acepta ? null : TEXTOS_ACTIVACION.terminos
    setErrorContrasena(faltaContrasena)
    setErrorRepetir(noCoinciden)
    setErrorTerminos(sinTerminos)
    if (faltaContrasena || noCoinciden || sinTerminos) return
    setEnviando(true)
    try {
      await api.activarCuenta(token, contrasena)
      setFinal('activada')
    } catch (error) {
      if (error instanceof ApiError && error.code === 'POLITICA_INCUMPLIDA') {
        setRechazadas(new Set((error.problem.errores ?? []).map((item) => item.regla ?? '').filter(Boolean)))
        setErrorContrasena('La contraseña no cumple las reglas marcadas.')
      } else if (error instanceof ApiError && error.code === 'ENLACE_EXPIRADO') {
        setFinal('vencido')
      } else if (error instanceof ApiError && (error.code === 'ENLACE_YA_USADO' || error.status === 410)) {
        setFinal('ya-usado')
      } else {
        setGeneral(mensajeDeError(error))
      }
    } finally {
      setEnviando(false)
    }
  }

  // Con otra sesión abierta, el login llevaría a esa cuenta (RutaPublica): primero se cierra (revisión de Luis en #28).
  const irAlLogin = async () => {
    if (sesion.tipo === 'activa') await cerrarSesion()
    navegar('/login', { replace: true, state: { aviso: TEXTOS_ACTIVACION.activada } })
  }

  let contenido
  if (!token) {
    contenido = <Alert color="yellow" role="alert">{TEXTOS_ACTIVACION.incompleto}</Alert>
  } else if (final === 'activada') {
    contenido = (
      <Stack gap="md">
        <Alert color="green" variant="light" role="status">{TEXTOS_ACTIVACION.activada}</Alert>
        {sesion.tipo === 'activa' && (
          <Alert color="yellow" variant="light" role="note">
            {TEXTOS_ACTIVACION.otraSesion} Ahora está abierta la de {enmascararCorreo(sesion.usuario.correo)}.
          </Alert>
        )}
        <Button type="button" onClick={() => { void irAlLogin() }}>
          {sesion.tipo === 'activa' ? 'Cerrar esa sesión e iniciar sesión' : 'Iniciar sesión'}
        </Button>
      </Stack>
    )
  } else if (final) {
    contenido = (
      <Stack gap="md">
        <Alert color="yellow" role="alert">{final === 'vencido' ? TEXTOS_ACTIVACION.vencido : TEXTOS_ACTIVACION.yaUsado}</Alert>
        <Anchor component={Link} to="/login" size="sm">Ir a iniciar sesión</Anchor>
      </Stack>
    )
  } else {
    contenido = (
      <form onSubmit={enviar} noValidate>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Se creó una cuenta para ti. Elige tu contraseña para empezar a usarla.
          </Text>
          {general && <Alert color="red" role="alert">{general}</Alert>}
          <PasswordInput
            label="Contraseña"
            autoComplete="new-password"
            value={contrasena}
            onChange={(e) => { setContrasena(e.currentTarget.value); setRechazadas(new Set()); setErrorContrasena(null) }}
            error={errorContrasena}
            required
          />
          <MedidorPassword politica={politica} valor={contrasena} rechazadas={rechazadas} />
          <PasswordInput
            label="Repite la contraseña"
            autoComplete="new-password"
            value={repetir}
            onChange={(e) => { setRepetir(e.currentTarget.value); setErrorRepetir(null) }}
            error={errorRepetir}
            required
            visibilityToggleButtonProps={{ 'aria-label': 'Mostrar confirmación' }}
          />
          <Checkbox
            label={<>Acepto los <EnlaceTerminos /> y el tratamiento de mis datos personales conforme a la Ley N.º 29733.</>}
            checked={acepta}
            onChange={(e) => { setAcepta(e.currentTarget.checked); setErrorTerminos(null) }}
            error={errorTerminos}
          />
          <Button type="submit" color="signal" fullWidth loading={enviando} disabled={enviando}>
            {enviando ? 'Activando…' : 'Activar mi cuenta'}
          </Button>
        </Stack>
      </form>
    )
  }

  return (
    <Container size="xs" py="xl">
      <Paper withBorder shadow="sm" p="xl" radius="md">
        <Stack gap="md">
          <Title order={1} size="h3">Activar tu cuenta</Title>
          {contenido}
        </Stack>
      </Paper>
    </Container>
  )
}
