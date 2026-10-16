// FRONT-12 — desbloqueo con el enlace del correo (SPEC-14). El token se lee de la URL y se
// quita al cargar (FRONT-00 §1.5); solo se consume al pulsar el botón, nunca al abrir.
import { Alert, Anchor, Button, Center, Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core'
import { IconLockOpen } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import type { Api } from '../../shared/api'
import { ApiError, mensajeDeError } from '../../shared/errores'

type Estado = 'inicial' | 'incompleto' | 'cargando' | 'exito' | 'vencido' | 'invalido' | 'error'

const SOPORTE = 'Si no puedes entrar, solicita al administrador de la plataforma que revise tu cuenta.'

/** Lee el token una sola vez y lo borra de la barra de direcciones. */
function tomarTokenDeLaUrl(): string | null {
  const url = new URL(window.location.href)
  const token = url.searchParams.get('token')
  if (token !== null) {
    url.searchParams.delete('token')
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
  }
  return token && token.trim() ? token : null
}

export function DesbloqueoPage({ api }: { api: Api }) {
  const token = useRef<string | null | undefined>(undefined)
  if (token.current === undefined) token.current = tomarTokenDeLaUrl()
  const [estado, setEstado] = useState<Estado>(token.current ? 'inicial' : 'incompleto')
  const [error, setError] = useState('')
  const resultado = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (estado !== 'inicial' && estado !== 'cargando') resultado.current?.focus()
  }, [estado])

  async function desbloquear() {
    if (!token.current || estado === 'cargando') return
    setEstado('cargando')
    try {
      await api.desbloquear(token.current)
      token.current = null
      setEstado('exito')
    } catch (e) {
      if (e instanceof ApiError && e.code === 'TOKEN_DESBLOQUEO_EXPIRADO') setEstado('vencido')
      else if (e instanceof ApiError && e.code === 'TOKEN_DESBLOQUEO_INVALIDO') setEstado('invalido')
      else {
        setError(mensajeDeError(e))
        setEstado('error')
      }
    }
  }

  return (
    <Center mih="100dvh" bg="cloud.2" p="md">
      <Paper withBorder shadow="sm" p="xl" w="100%" maw={460} radius="md">
        <Stack gap="md">
          <Stack gap="xs" align="center">
            <ThemeIcon size={48} radius="xl" color="signal" aria-hidden>
              <IconLockOpen size={28} />
            </ThemeIcon>
            <Title order={1} size="h3" ta="center">
              Desbloquear tu cuenta
            </Title>
          </Stack>

          {(estado === 'inicial' || estado === 'cargando' || estado === 'error') && (
            <>
              <Text size="sm">
                Bloqueamos tu cuenta después de varios intentos fallidos de inicio de sesión. Pulsa el botón para
                desbloquearla ahora.
              </Text>
              {estado === 'error' && (
                <Alert color="red" role="alert" tabIndex={-1} ref={resultado}>
                  {error}
                </Alert>
              )}
              <Button color="signal" fullWidth loading={estado === 'cargando'} onClick={desbloquear}>
                {estado === 'cargando' ? 'Desbloqueando…' : 'Desbloquear mi cuenta'}
              </Button>
            </>
          )}

          <div tabIndex={-1} ref={estado === 'error' ? undefined : resultado} aria-live="polite">
            {estado === 'exito' && (
              <Alert color="green" title="Cuenta desbloqueada">
                Tu cuenta está desbloqueada. Ya puedes iniciar sesión. Si no fuiste tú quien intentó entrar, te
                recomendamos cambiar tu contraseña.
              </Alert>
            )}
            {estado === 'vencido' && (
              <Alert color="yellow" title="Enlace vencido">
                Este enlace venció: los enlaces de desbloqueo duran 30 minutos. {SOPORTE}
              </Alert>
            )}
            {estado === 'invalido' && (
              <Alert color="yellow" title="Enlace no válido">
                Este enlace ya no es válido: puede que ya se haya usado o que haya uno más reciente. {SOPORTE}
              </Alert>
            )}
            {estado === 'incompleto' && (
              <Alert color="yellow" title="Enlace incompleto">
                El enlace no es válido. Ábrelo completo desde el correo que te enviamos. {SOPORTE}
              </Alert>
            )}
          </div>

          {estado !== 'inicial' && estado !== 'cargando' && estado !== 'error' && (
            <Anchor component={Link} to="/login" ta="center">
              Iniciar sesión
            </Anchor>
          )}
        </Stack>
      </Paper>
    </Center>
  )
}
