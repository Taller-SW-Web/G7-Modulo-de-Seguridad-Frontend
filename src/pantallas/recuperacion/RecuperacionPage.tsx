import { Anchor, Container, Paper, Stack, Title } from '@mantine/core'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import type { Api } from '../../shared/api'
import { DefinirContrasena } from './componentes/DefinirContrasena'
import { PedirEnlace } from './componentes/PedirEnlace'

interface EstadoLlegada {
  correo?: string
  enfocarEnviar?: boolean
}

export function RecuperacionPage({ api }: { api: Api }) {
  const location = useLocation()
  const navegar = useNavigate()
  const [token, setToken] = useState(() => new URLSearchParams(location.search).get('token')?.trim() ?? '')
  const [enlaceRetirado, setEnlaceRetirado] = useState(false)

  useEffect(() => {
    if (!new URLSearchParams(location.search).has('token')) return
    navegar({ pathname: location.pathname, hash: location.hash }, { replace: true, state: location.state })
    setEnlaceRetirado(true)
  }, [location.hash, location.pathname, location.search, location.state, navegar])

  const estado = location.state as EstadoLlegada | null
  return (
    <Container size="xs" py="xl">
      <Paper withBorder shadow="sm" p="xl" radius="md">
        <Stack gap="md">
          <Title order={1} size="h3">Recuperar contraseña</Title>
          {token ? (
            enlaceRetirado && <DefinirContrasena api={api} token={token} onPedirEnlace={() => setToken('')} />
          ) : (
            <PedirEnlace
              api={api}
              correoInicial={estado?.correo ?? ''}
              enfocarEnviar={estado?.enfocarEnviar ?? false}
            />
          )}
          <Anchor component={Link} to="/login" size="sm">
            Volver a iniciar sesión
          </Anchor>
        </Stack>
      </Paper>
    </Container>
  )
}
