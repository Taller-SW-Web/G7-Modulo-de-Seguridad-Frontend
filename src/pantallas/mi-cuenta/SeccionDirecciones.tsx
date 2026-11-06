// FRONT-06 sección «Direcciones» (FEAT-04-T4). Solo para CLIENTE: la decide MiCuentaPage y el backend
// sigue siendo quien autoriza. Solo listado y alta (H-04); sin editar ni eliminar.
import { Alert, Badge, Box, Button, Group, Paper, Skeleton, Stack, Text, Title } from '@mantine/core'
import { useCallback, useEffect, useState } from 'react'
import type { Api } from '../../shared/api'
import { mensajeDeError } from '../../shared/errores'
import type { Direccion } from '../../shared/tipos'
import { FormularioDireccion } from './FormularioDireccion'

type Carga = { tipo: 'cargando' } | { tipo: 'listo'; direcciones: Direccion[] } | { tipo: 'error'; error: unknown }

function TarjetaDireccion({ d }: { d: Direccion }) {
  return (
    <Paper withBorder p="md" radius="md" component="li">
      <Stack gap={2}>
        <Group gap="xs">
          {d.etiqueta && <Text fw={600}>{d.etiqueta}</Text>}
          {d.esPredeterminada && <Badge variant="light">Predeterminada</Badge>}
        </Group>
        <Text>{d.direccion}</Text>
        <Text size="sm" c="dimmed">
          {d.distrito}, {d.provincia}, {d.departamento}
        </Text>
        {d.referencia && (
          <Text size="sm" c="dimmed">
            Referencia: {d.referencia}
          </Text>
        )}
      </Stack>
    </Paper>
  )
}

export function SeccionDirecciones({ api, usuarioId }: { api: Api; usuarioId: string }) {
  const [carga, setCarga] = useState<Carga>({ tipo: 'cargando' })
  const [intento, setIntento] = useState(0)
  const [agregando, setAgregando] = useState(false)

  useEffect(() => {
    const control = new AbortController()
    api
      .listarDirecciones(usuarioId, control.signal)
      .then((r) => setCarga({ tipo: 'listo', direcciones: r.direcciones }))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setCarga({ tipo: 'error', error })
      })
    return () => control.abort()
  }, [api, usuarioId, intento])

  const reintentar = useCallback(() => {
    setCarga({ tipo: 'cargando' })
    setIntento((n) => n + 1)
  }, [])

  // Tras un 201 se recarga la lista del backend: así la anterior predeterminada pierde la marca (ESC-16.9).
  const guardada = useCallback(() => {
    setAgregando(false)
    setIntento((n) => n + 1)
  }, [])

  return (
    <section aria-labelledby="titulo-direcciones">
      <Stack gap="sm">
        <Group justify="space-between">
          <Title order={2} size="h4" id="titulo-direcciones">
            Direcciones
          </Title>
          {carga.tipo === 'listo' && !agregando && (
            <Button variant="light" size="xs" onClick={() => setAgregando(true)}>
              Añadir dirección
            </Button>
          )}
        </Group>
        {carga.tipo === 'cargando' && <Skeleton h={90} aria-label="Cargando tus direcciones" />}
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
        {carga.tipo === 'listo' && carga.direcciones.length === 0 && !agregando && (
          <Text c="dimmed">Aún no tienes direcciones guardadas.</Text>
        )}
        {carga.tipo === 'listo' && carga.direcciones.length > 0 && (
          <Box
            component="ul"
            aria-label="Tus direcciones"
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mantine-spacing-sm)', listStyle: 'none', margin: 0, padding: 0 }}
          >
            {carga.direcciones.map((d) => (
              <TarjetaDireccion key={d.id} d={d} />
            ))}
          </Box>
        )}
        {carga.tipo === 'listo' && agregando && (
          <FormularioDireccion api={api} usuarioId={usuarioId} onGuardada={guardada} onCancelar={() => setAgregando(false)} />
        )}
      </Stack>
    </section>
  )
}
