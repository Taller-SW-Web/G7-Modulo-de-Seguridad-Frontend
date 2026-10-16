// FRONT-10 — cambio de contraseña (SPEC-07). 401 CREDENCIALES_INVALIDAS aquí es «actual
// incorrecta»: no renueva ni cierra la sesión.
import { Alert, Anchor, Button, Container, Group, Paper, PasswordInput, Stack, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { MedidorPassword } from '../../componentes/MedidorPassword'
import type { Api } from '../../shared/api'
import { ApiError, mensajeDeError } from '../../shared/errores'
import type { PoliticaPassword } from '../../shared/tipos'

interface Errores {
  actual?: string
  nueva?: string
  repetir?: string
}

export function CambiarContrasenaPage({ api }: { api: Api }) {
  const navegar = useNavigate()
  const [politica, setPolitica] = useState<PoliticaPassword | null>(null)
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repetir, setRepetir] = useState('')
  const [errores, setErrores] = useState<Errores>({})
  const [rechazadas, setRechazadas] = useState<ReadonlySet<string>>(new Set())
  const [general, setGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const refActual = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const control = new AbortController()
    api.politicaPassword(control.signal).then(setPolitica).catch(() => setPolitica(null))
    return () => control.abort()
  }, [api])

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    const e: Errores = {}
    if (!actual) e.actual = 'Escribe tu contraseña actual.'
    if (!nueva) e.nueva = 'Escribe la nueva contraseña.'
    else if (nueva === actual) e.nueva = 'La contraseña nueva debe ser distinta de la actual.'
    if (nueva && repetir !== nueva) e.repetir = 'Las contraseñas no coinciden.'
    setErrores(e)
    setGeneral(null)
    if (e.actual || e.nueva || e.repetir || enviando) return
    setEnviando(true)
    try {
      await api.cambiarContrasena(actual, nueva)
      notifications.show({
        color: 'green',
        message: 'Tu contraseña se cambió. Cerramos tus sesiones en otros dispositivos; esta sigue abierta.',
      })
      navegar('/mi-cuenta', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CREDENCIALES_INVALIDAS') {
        setActual('')
        setErrores({ actual: 'La contraseña actual no es correcta.' })
        refActual.current?.focus()
      } else if (err instanceof ApiError && err.code === 'POLITICA_INCUMPLIDA') {
        setRechazadas(new Set((err.problem.errores ?? []).map((x) => x.regla ?? '').filter(Boolean)))
        setErrores({ nueva: 'La contraseña nueva no cumple las reglas marcadas.' })
      } else {
        setGeneral(mensajeDeError(err))
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Container size="xs" py="lg">
      <Paper withBorder p="lg" radius="md">
        <form onSubmit={enviar} noValidate>
          <Stack gap="md">
            <Title order={1} size="h3">
              Cambiar contraseña
            </Title>
            {general && (
              <Alert color="red" role="alert">
                {general}
              </Alert>
            )}
            <PasswordInput
              ref={refActual}
              label="Contraseña actual"
              autoComplete="current-password"
              value={actual}
              onChange={(e) => setActual(e.currentTarget.value)}
              error={errores.actual}
              required
            />
            <PasswordInput
              label="Contraseña nueva"
              autoComplete="new-password"
              value={nueva}
              onChange={(e) => {
                setNueva(e.currentTarget.value)
                setRechazadas(new Set())
              }}
              error={errores.nueva}
              required
            />
            <MedidorPassword politica={politica} valor={nueva} rechazadas={rechazadas} />
            <PasswordInput
              label="Repite la contraseña nueva"
              autoComplete="new-password"
              value={repetir}
              onChange={(e) => setRepetir(e.currentTarget.value)}
              error={errores.repetir}
              required
            />
            <Group justify="space-between">
              <Anchor component={Link} to="/mi-cuenta" size="sm">
                Cancelar
              </Anchor>
              <Button type="submit" loading={enviando}>
                {enviando ? 'Cambiando…' : 'Cambiar contraseña'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}
