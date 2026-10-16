// FRONT-13 — actividad propia (SPEC-13, EP-06-T005): solo hechos de la propia cuenta, 20 por página.
import { Alert, Anchor, Badge, Button, Container, Group, Pagination, Paper, Skeleton, Stack, Table, Text, Title } from '@mantine/core'
import { IconAlertTriangle } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { Api } from '../../shared/api'
import { mensajeDeError } from '../../shared/errores'
import { useSesion } from '../../shared/sesion'
import type { PaginaActividad, RegistroActividad } from '../../shared/tipos'
import { TEXTO_ACCION } from './textosActividad'

const DESTACADAS = new Set(['SESION_FALLIDA', 'REFRESCO_REUTILIZADO', 'OTP_FALLIDO', 'CUENTA_BLOQUEADA'])
const fecha = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' })

type Carga = { tipo: 'cargando' } | { tipo: 'listo'; pagina: PaginaActividad } | { tipo: 'error'; error: unknown }

function Fila({ r, titular }: { r: RegistroActividad; titular: string | null }) {
  const porAdmin = r.actorTipo === 'USUARIO' && r.actorId && titular && r.actorId !== titular
  return (
    <Table.Tr>
      <Table.Td>{fecha.format(new Date(r.fecha))}</Table.Td>
      <Table.Td>
        <Group gap={6} wrap="nowrap">
          {DESTACADAS.has(r.accion) && (
            <Badge color="orange" variant="light" leftSection={<IconAlertTriangle size={12} />}>
              Atención
            </Badge>
          )}
          <Text size="sm">
            {TEXTO_ACCION[r.accion] ?? r.accion}
            {porAdmin ? ' (por un administrador)' : ''}
          </Text>
        </Group>
      </Table.Td>
      <Table.Td>{r.resultado === 'EXITO' ? 'Correcto' : 'Fallido'}</Table.Td>
      <Table.Td>{r.ip ?? '—'}</Table.Td>
    </Table.Tr>
  )
}

export function ActividadPage({ api }: { api: Api }) {
  const { estado } = useSesion()
  const titular = estado.tipo === 'activa' ? estado.usuario.id : null
  const [pagina, setPagina] = useState(1)
  const [carga, setCarga] = useState<Carga>({ tipo: 'cargando' })
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    const control = new AbortController()
    setCarga({ tipo: 'cargando' })
    api
      .actividadPropia(pagina, control.signal)
      .then((p) => setCarga({ tipo: 'listo', pagina: p }))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setCarga({ tipo: 'error', error })
      })
    return () => control.abort()
  }, [api, pagina, intento])

  return (
    <Container size="md" py="lg">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={1} size="h2">
            Actividad de mi cuenta
          </Title>
          <Anchor component={Link} to="/mi-cuenta" size="sm">
            Volver a Mi cuenta
          </Anchor>
        </Group>
        {carga.tipo === 'cargando' && <Skeleton h={160} aria-label="Cargando actividad" />}
        {carga.tipo === 'error' && (
          <Alert color="red" role="alert">
            <Stack gap="xs" align="flex-start">
              <Text size="sm">{mensajeDeError(carga.error)}</Text>
              <Button size="xs" variant="light" onClick={() => setIntento((n) => n + 1)}>
                Reintentar
              </Button>
            </Stack>
          </Alert>
        )}
        {carga.tipo === 'listo' && carga.pagina.registros.length === 0 && (
          <Paper withBorder p="lg">
            <Text>No hay actividad registrada en los últimos 90 días.</Text>
          </Paper>
        )}
        {carga.tipo === 'listo' && carga.pagina.registros.length > 0 && (
          <Paper withBorder radius="md">
            <Table.ScrollContainer minWidth={560}>
              <Table verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th scope="col">Fecha</Table.Th>
                    <Table.Th scope="col">Qué pasó</Table.Th>
                    <Table.Th scope="col">Resultado</Table.Th>
                    <Table.Th scope="col">IP</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {carga.pagina.registros.map((r) => (
                    <Fila key={r.id} r={r} titular={titular} />
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            <Group justify="flex-end" p="md">
              <Pagination
                total={Math.max(1, Math.ceil(carga.pagina.total / carga.pagina.tamano))}
                value={pagina}
                onChange={setPagina}
                size="sm"
              />
            </Group>
          </Paper>
        )}
      </Stack>
    </Container>
  )
}
