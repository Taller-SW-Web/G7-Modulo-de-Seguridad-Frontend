// FRONT-07 — listado administrativo (alcance H3: consulta y filtros, sin altas ni acciones de estado).
import { Alert, Anchor, Badge, Button, Container, Group, Pagination, Paper, Skeleton, Stack, Table, Text, Title } from '@mantine/core'
import { Link } from 'react-router'
import type { Api } from '../../shared/api'
import { ApiError, mensajeDeError } from '../../shared/errores'
import { COLOR_ESTADO, ETIQUETA_ESTADO, ETIQUETA_ROL, textoEstado } from '../../shared/etiquetas'
import type { FiltrosUsuarios as Filtros } from '../../shared/api'
import { FiltrosUsuarios } from './FiltrosUsuarios'
import { useListadoUsuarios } from './useListadoUsuarios'

function resumenFiltros(f: Filtros): string {
  const partes = [
    f.estado ? `estado ${ETIQUETA_ESTADO[f.estado].toLowerCase()}` : null,
    f.rol ? `rol ${ETIQUETA_ROL[f.rol]}` : null,
    f.correo ? `correo con «${f.correo}»` : null,
  ].filter(Boolean)
  return partes.length ? `Cuentas filtradas por ${partes.join(', ')}` : 'Todas las cuentas'
}

export function AdminListadoPage({ api }: { api: Api }) {
  const { filtros, carga, cambiar, quitarFiltros, reintentar } = useListadoUsuarios(api)
  const hayFiltros = Boolean(filtros.estado || filtros.rol || filtros.correo)

  return (
    <Container size="xl" py="md">
      <Stack gap="md">
        <Title order={1} size="h2">
          Usuarios
        </Title>
        <Paper withBorder p="md" radius="md">
          <FiltrosUsuarios filtros={filtros} onCambiar={cambiar} />
        </Paper>

        {carga.tipo === 'error' &&
          (carga.error instanceof ApiError && carga.error.status === 403 ? (
            <Alert color="red" role="alert">
              No tienes permiso para ver esta página.
            </Alert>
          ) : (
            <Alert color="red" role="alert" title="No se pudo cargar el listado">
              <Stack gap="xs" align="flex-start">
                <Text size="sm">{mensajeDeError(carga.error)}</Text>
                <Button size="xs" variant="light" onClick={reintentar}>
                  Reintentar
                </Button>
              </Stack>
            </Alert>
          ))}

        {carga.tipo === 'cargando' && (
          <Stack gap="xs" aria-busy="true" aria-label="Cargando cuentas">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} h={36} />
            ))}
          </Stack>
        )}

        {carga.tipo === 'listo' && carga.pagina.usuarios.length === 0 && (
          <Paper withBorder p="lg" radius="md">
            <Stack align="center" gap="sm">
              <Text>{hayFiltros ? 'Ninguna cuenta coincide con los filtros.' : 'Todavía no hay cuentas.'}</Text>
              {hayFiltros && (
                <Button variant="light" onClick={quitarFiltros}>
                  Quitar filtros
                </Button>
              )}
            </Stack>
          </Paper>
        )}

        {carga.tipo === 'listo' && carga.pagina.usuarios.length > 0 && (
          <Paper withBorder radius="md">
            <Table.ScrollContainer minWidth={720}>
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Caption>{resumenFiltros(filtros)}</Table.Caption>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th scope="col">Correo</Table.Th>
                    <Table.Th scope="col">Nombre</Table.Th>
                    <Table.Th scope="col">Roles</Table.Th>
                    <Table.Th scope="col">Estado</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {carga.pagina.usuarios.map((u) => (
                    <Table.Tr key={u.id}>
                      <Table.Td>
                        <Anchor component={Link} to={`/admin/usuarios/${u.id}`}>
                          {u.correo}
                        </Anchor>
                      </Table.Td>
                      <Table.Td>{u.nombreCompleto}</Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          {u.roles.length === 0 ? (
                            <Text size="sm" c="dimmed">
                              Sin roles
                            </Text>
                          ) : (
                            u.roles.map((r) => (
                              <Badge key={r} variant="light" size="sm">
                                {ETIQUETA_ROL[r]}
                              </Badge>
                            ))
                          )}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={COLOR_ESTADO[u.estado]} variant="dot">
                          {textoEstado(u)}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            <Group justify="space-between" p="md" wrap="wrap">
              <Text size="sm" c="dimmed">
                {carga.pagina.total} {carga.pagina.total === 1 ? 'cuenta' : 'cuentas'} · Página {carga.pagina.pagina} de{' '}
                {Math.max(1, Math.ceil(carga.pagina.total / carga.pagina.tamano))}
              </Text>
              <Pagination
                total={Math.max(1, Math.ceil(carga.pagina.total / carga.pagina.tamano))}
                value={carga.pagina.pagina}
                onChange={(pagina) => cambiar({ pagina })}
                size="sm"
              />
            </Group>
          </Paper>
        )}
      </Stack>
    </Container>
  )
}
