// FRONT-01 — Inicio de sesión. Acción principal en `signal` (pantallas de autenticación).
import { Alert, Button, Center, Paper, PasswordInput, Stack, Text, TextInput, ThemeIcon, Title } from '@mantine/core'
import { IconShieldLock } from '@tabler/icons-react'
import { useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import type { Api } from '../../shared/api'
import { destinoPorDefecto, volverSeguro } from '../../shared/navegacion'
import { useSesion } from '../../shared/sesion'
import { leerClaims } from '../../shared/jwt'
import { guardarDesafio } from '../../shared/desafio'
import { useLogin, validarCampos } from './useLogin'

const AVISOS_LLEGADA = {
  cerrada: 'Cerraste sesión.',
  vencida: 'Tu sesión terminó. Inicia sesión de nuevo.',
  revocada: 'Tu sesión terminó. Inicia sesión de nuevo.',
} as const

export function LoginPage({ api }: { api: Api }) {
  const { estado, aceptarSesion } = useSesion()
  const navegar = useNavigate()
  const { search, state } = useLocation()
  const avisoRecibido = (state as { aviso?: string } | null)?.aviso || null
  const { enviando, iniciar } = useLogin(api)
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [erroresCampo, setErroresCampo] = useState<{ correo?: string; contrasena?: string }>({})
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const refContrasena = useRef<HTMLInputElement>(null)
  const llegada =
    avisoRecibido ?? (estado.tipo === 'sin-sesion' && estado.motivo ? AVISOS_LLEGADA[estado.motivo] : null)

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setError(null)
    setAviso(null)
    const errores = validarCampos(correo, contrasena)
    setErroresCampo(errores)
    if (errores.correo || errores.contrasena) return

    const resultado = await iniciar(correo, contrasena)
    switch (resultado.tipo) {
      case 'sesion': {
        aceptarSesion(resultado.sesion)
        const volver = volverSeguro(new URLSearchParams(search).get('volver'))
        navegar(volver ?? destinoPorDefecto(leerClaims(resultado.sesion.accessToken).permisos), { replace: true })
        return
      }
      case 'mfa':
        // FRONT-04: el desafío pasa en memoria, nunca en la URL.
        guardarDesafio(resultado.desafio)
        navegar(`/otp${search}`)
        return
      case 'caducada':
        setAviso('Tu contraseña caducó.')
        return
      case 'error':
        if (!resultado.mensaje) return
        setError(resultado.mensaje)
        if (resultado.credenciales) {
          setContrasena('')
          refContrasena.current?.focus()
        }
    }
  }

  return (
    <Center mih="100dvh" bg="cloud.2" p="md">
      <Paper withBorder shadow="sm" p="xl" w="100%" maw={420} radius="md">
        <form onSubmit={enviar} noValidate>
          <Stack gap="md">
            <Stack gap="xs" align="center">
              <ThemeIcon size={48} radius="xl" color="signal" aria-hidden>
                <IconShieldLock size={28} />
              </ThemeIcon>
              <Title order={1} size="h3" ta="center">
                Iniciar sesión
              </Title>
              <Text size="sm" c="dimmed" ta="center">
                Centro de Seguridad del marketplace
              </Text>
            </Stack>

            {llegada && !error && (
              <Alert color="blue" variant="light">
                {llegada}
              </Alert>
            )}
            {error && (
              <Alert color="red" variant="light" role="alert">
                {error}
              </Alert>
            )}
            {aviso && (
              <Alert color="yellow" variant="light" role="status">
                {aviso}
              </Alert>
            )}

            <TextInput
              label="Correo"
              type="email"
              autoComplete="email"
              value={correo}
              onChange={(e) => setCorreo(e.currentTarget.value)}
              error={erroresCampo.correo}
              readOnly={enviando}
              required
            />
            <PasswordInput
              ref={refContrasena}
              label="Contraseña"
              autoComplete="current-password"
              value={contrasena}
              onChange={(e) => setContrasena(e.currentTarget.value)}
              error={erroresCampo.contrasena}
              readOnly={enviando}
              visibilityToggleButtonProps={{ 'aria-label': 'Mostrar contraseña' }}
              required
            />
            <Button type="submit" color="signal" fullWidth loading={enviando} disabled={enviando}>
              {enviando ? 'Iniciando sesión…' : 'Iniciar sesión'}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  )
}
