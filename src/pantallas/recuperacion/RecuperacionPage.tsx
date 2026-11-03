import { Anchor, Container, Paper, Stack, Title } from '@mantine/core'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import type { Api } from '../../shared/api'
import { canalDelEnlace, retornoDelCanal, type CanalOrigen } from '../../shared/retornoCanal'
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
  const [canal] = useState<CanalOrigen>(() => canalDelEnlace(new URLSearchParams(location.search).get('canal')))
  const [enlaceRetirado, setEnlaceRetirado] = useState(false)
  const retorno = retornoDelCanal(canal)

  useEffect(() => {
    const parametros = new URLSearchParams(location.search)
    if (!parametros.has('token') && !parametros.has('canal')) return
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
            enlaceRetirado && <DefinirContrasena api={api} token={token} canal={canal} onPedirEnlace={() => setToken('')} />
          ) : (
            <PedirEnlace
              api={api}
              correoInicial={estado?.correo ?? ''}
              enfocarEnviar={estado?.enfocarEnviar ?? false}
              canal={canal}
            />
          )}
          {!token && (
            retorno ? (
              <Anchor href={retorno} size="sm">Volver a iniciar sesión</Anchor>
            ) : (
              <Anchor component={Link} to="/login" size="sm">Volver a iniciar sesión</Anchor>
            )
          )}
        </Stack>
      </Paper>
    </Container>
  )
}
