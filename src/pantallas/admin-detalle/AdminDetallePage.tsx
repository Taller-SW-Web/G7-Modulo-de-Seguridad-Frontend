// FRONT-08 — detalle administrativo (EP-01-T006). Carga /usuarios/{id} una vez y entrega
// el DTO a los bloques; SeccionRoles (EP-05-T005) pide recargar tras un cambio.
import { Alert, Anchor, Badge, Button, Container, Group, Paper, SimpleGrid, Skeleton, Stack, Text, Title } from '@mantine/core'
import { IconArrowLeft } from '@tabler/icons-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import type { Api } from '../../shared/api'
import { ApiError, mensajeDeError } from '../../shared/errores'
import { COLOR_ESTADO, textoEstado, textoVencimiento } from '../../shared/etiquetas'
import type { Usuario } from '../../shared/tipos'
import { SeccionRoles } from './SeccionRoles'
import { AccionesBloqueo } from './AccionesBloqueo'

type Carga = { tipo: 'cargando' } | { tipo: 'listo'; usuario: Usuario } | { tipo: 'error'; error: unknown }

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

export function AdminDetallePage({ api }: { api: Api }) {
  const { id = '' } = useParams()
  const [carga, setCarga] = useState<Carga>({ tipo: 'cargando' })
  const [version, setVersion] = useState(0)
  const recargar = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    const control = new AbortController()
    api
      .obtenerUsuario(id, control.signal)
      .then((usuario) => setCarga({ tipo: 'listo', usuario }))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setCarga({ tipo: 'error', error })
      })
    return () => control.abort()
  }, [api, id, version])

  const volver = (
    <Anchor component={Link} to="/admin/usuarios" size="sm">
      <Group gap={4}>
        <IconArrowLeft size={14} /> Volver al listado
      </Group>
    </Anchor>
  )

  if (carga.tipo === 'cargando')
    return (
      <Container size="lg" py="md">
        <Stack aria-busy="true" aria-label="Cargando cuenta">
          <Skeleton h={40} w="50%" />
          <Skeleton h={140} />
        </Stack>
      </Container>
    )

  if (carga.tipo === 'error') {
    const e = carga.error
    const mensaje =
      e instanceof ApiError && e.code === 'NO_ENCONTRADO'
        ? 'No encontramos esa cuenta.'
        : e instanceof ApiError && e.status === 403
          ? 'No tienes permiso para ver esta página.'
          : mensajeDeError(e)
    return (
      <Container size="lg" py="md">
        <Stack>
          {volver}
          <Alert color="red" role="alert">
            <Stack gap="xs" align="flex-start">
              <Text size="sm">{mensaje}</Text>
              {!(e instanceof ApiError && e.status < 500) && (
                <Button size="xs" variant="light" onClick={recargar}>
                  Reintentar
                </Button>
              )}
            </Stack>
          </Alert>
        </Stack>
      </Container>
    )
  }

  const { usuario } = carga
  return (
    <Container size="lg" py="md">
      <Stack gap="md">
        {volver}
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Stack gap={2}>
            <Title order={1} size="h2">
              {usuario.nombreCompleto}
            </Title>
            <Text c="dimmed">{usuario.correo}</Text>
          </Stack>
          <Badge color={COLOR_ESTADO[usuario.estado]} variant="dot" size="lg">
            {textoEstado(usuario)}
          </Badge>
        </Group>

        {usuario.estado === 'BLOQUEADO' && usuario.bloqueo && (
          <Alert color="red" variant="light" title="Bloqueo activo" role="region" aria-label="Bloqueo activo">
            <Stack gap={4}>
              <Text size="sm">
                {usuario.bloqueo.tipo === 'AUTOMATICO' ? 'Automático, por intentos fallidos' : 'Manual'} ·{' '}
                {textoVencimiento(usuario.bloqueo.hasta)}
              </Text>
              {usuario.bloqueo.motivo && <Text size="sm">Motivo: {usuario.bloqueo.motivo}</Text>}
            </Stack>
          </Alert>
        )}

        <Paper withBorder p="lg" radius="md">
          <Stack gap="md">
            <Title order={2} size="h4">
              Datos de la cuenta
            </Title>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Dato etiqueta="Nombres" valor={usuario.nombres} />
              <Dato etiqueta="Apellidos" valor={usuario.apellidos} />
              <Dato
                etiqueta="Correo"
                valor={usuario.correo}
                nota={usuario.correoVerificado ? 'Verificado' : 'Sin verificar'}
              />
              <Dato
                etiqueta="Celular"
                valor={usuario.celular}
                nota={usuario.celular ? (usuario.celularVerificado ? 'Verificado' : 'Sin verificar') : undefined}
              />
              <Dato
                etiqueta="Documento"
                valor={usuario.documentoEnmascarado ? `${usuario.tipoDocumento ?? ''} ${usuario.documentoEnmascarado}`.trim() : null}
              />
              <Dato etiqueta="Segundo factor" valor={usuario.mfaHabilitado ? 'Activo' : 'Inactivo'} />
            </SimpleGrid>
          </Stack>
        </Paper>

        <SeccionRoles api={api} usuario={usuario} onActualizado={recargar} />
        <AccionesBloqueo key={usuario.id} api={api} usuario={usuario} onActualizado={recargar} />
      </Stack>
    </Container>
  )
}
