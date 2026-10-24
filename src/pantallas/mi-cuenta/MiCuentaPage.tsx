// FRONT-06 (lectura, EP-08-T005): perfil propio desde GET /auth/me, nunca desde el token.
import { Alert, Badge, Button, Container, Group, Paper, SimpleGrid, Skeleton, Stack, Text, Title } from '@mantine/core'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { Api } from '../../shared/api'
import { mensajeDeError } from '../../shared/errores'
import { ETIQUETA_ROL } from '../../shared/etiquetas'
import type { Usuario } from '../../shared/tipos'
import { EdicionPerfil } from './EdicionPerfil'
import { SeccionDirecciones } from './SeccionDirecciones'

type Carga = { tipo: 'cargando' } | { tipo: 'listo'; perfil: Usuario } | { tipo: 'error'; error: unknown }

function Dato({ etiqueta, valor, nota }: { etiqueta: string; valor?: string | null; nota?: string }) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {etiqueta}
      </Text>
      <Text>{valor || '—'}</Text>
      {nota && (
        <Text size="xs" c="dimmed">
          {nota}
        </Text>
      )}
    </Stack>
  )
}

export function MiCuentaPage({ api }: { api: Api }) {
  const [carga, setCarga] = useState<Carga>({ tipo: 'cargando' })
  const [intento, setIntento] = useState(0)
  const [editando, setEditando] = useState(false)
  const reintentar = useCallback(() => setIntento((n) => n + 1), [])

  useEffect(() => {
    const control = new AbortController()
    api
      .perfilPropio(control.signal)
      .then((perfil) => setCarga({ tipo: 'listo', perfil }))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setCarga({ tipo: 'error', error })
      })
    return () => control.abort()
  }, [api, intento])

  return (
    <Container size="sm" py="lg">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={1} size="h2">
            Mi cuenta
          </Title>
          <Group gap="xs">
            <Button component={Link} to="/mi-cuenta/seguridad" variant="light" size="xs">
              Segundo factor
            </Button>
            <Button component={Link} to="/mi-cuenta/contrasena" variant="light" size="xs">
              Cambiar contraseña
            </Button>
            <Button component={Link} to="/mi-cuenta/actividad" variant="light" size="xs">
              Ver actividad
            </Button>
          </Group>
        </Group>
        {carga.tipo === 'cargando' && <Skeleton h={180} aria-label="Cargando tu perfil" />}
        {carga.tipo === 'error' && (
          <Alert color="red" role="alert">
            <Stack gap="xs" align="flex-start">
              <Text size="sm">{mensajeDeError(carga.error)}</Text>
              <Button size="xs" variant="light" onClick={reintentar}>
                Reintentar
              </Button>
            </Stack>
          </Alert>
        )}
        {carga.tipo === 'listo' && (
          <Paper withBorder p="lg" radius="md">
            <Stack gap="md">
              <Group justify="space-between" align="flex-start">
                <Stack gap={2}>
                  <Text fw={700} size="lg">
                    {carga.perfil.nombreCompleto}
                  </Text>
                  <Text c="dimmed">{carga.perfil.correo}</Text>
                </Stack>
                <Group gap="xs">
                  {carga.perfil.roles.map((rol) => (
                    <Badge key={rol} variant="light">
                      {ETIQUETA_ROL[rol]}
                    </Badge>
                  ))}
                </Group>
              </Group>
              {editando ? (
                <EdicionPerfil
                  api={api}
                  perfil={carga.perfil}
                  onCancelar={() => setEditando(false)}
                  onGuardado={(perfil) => {
                    setCarga({ tipo: 'listo', perfil })
                    setEditando(false)
                  }}
                />
              ) : (
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <Dato etiqueta="Nombres" valor={carga.perfil.nombres} />
                <Dato etiqueta="Apellidos" valor={carga.perfil.apellidos} />
                <Dato
                  etiqueta="Correo"
                  valor={carga.perfil.correo}
                  nota={carga.perfil.correoVerificado ? 'Verificado' : 'Sin verificar'}
                />
                <Dato
                  etiqueta="Celular"
                  valor={carga.perfil.celular}
                  nota={carga.perfil.celular ? (carga.perfil.celularVerificado ? 'Verificado' : 'Sin verificar') : undefined}
                />
                <Dato etiqueta="Segundo factor" valor={carga.perfil.mfaHabilitado ? 'Activo' : 'Inactivo'} />
              </SimpleGrid>
              )}
              {!editando && (
                <Group justify="flex-end">
                  <Button variant="light" size="xs" onClick={() => setEditando(true)}>
                    Editar mis datos
                  </Button>
                </Group>
              )}
            </Stack>
          </Paper>
        )}
        {carga.tipo === 'listo' && carga.perfil.roles.includes('CLIENTE') && (
          <Paper withBorder p="lg" radius="md">
            <SeccionDirecciones api={api} usuarioId={carga.perfil.id} />
          </Paper>
        )}
      </Stack>
    </Container>
  )
}
