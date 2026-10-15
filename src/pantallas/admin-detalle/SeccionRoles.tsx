// EP-05-T005 — SeccionRoles (FRONT-08, SPEC-11). Asigna o revoca un rol cada vez, nunca
// reemplaza el array completo; tras un cambio correcto pide recargar el detalle.
import { Alert, Badge, Button, Group, Modal, Paper, Select, Stack, Text, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconPlus, IconX } from '@tabler/icons-react'
import { useState } from 'react'
import type { Api } from '../../shared/api'
import { ApiError, mensajeDeError } from '../../shared/errores'
import { ETIQUETA_ROL } from '../../shared/etiquetas'
import { PERMISO_ASIGNAR_ROL } from '../../shared/navegacion'
import { useSesion } from '../../shared/sesion'
import { CODIGOS_ROL, type CodigoRol, type Usuario } from '../../shared/tipos'
import { MENSAJE_PROTEGIDO, textoConfirmacion, type Cambio } from './textosRoles'

function mensajeRol(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'ADMINISTRADOR_PROTEGIDO') return MENSAJE_PROTEGIDO
    if (error.code === 'VALIDACION') return 'Ese rol no existe.'
    if (error.code === 'NO_ENCONTRADO') return 'Esa cuenta ya no existe.'
  }
  return mensajeDeError(error)
}

export function SeccionRoles({ api, usuario, onActualizado }: { api: Api; usuario: Usuario; onActualizado: () => void }) {
  const { estado, tienePermiso } = useSesion()
  const puedeGestionar = tienePermiso(PERMISO_ASIGNAR_ROL)
  const esPropia = estado.tipo === 'activa' && estado.usuario.id === usuario.id
  const disponibles = CODIGOS_ROL.filter((r) => !usuario.roles.includes(r))
  const [elegido, setElegido] = useState<CodigoRol | null>(null)
  const [cambio, setCambio] = useState<Cambio | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirmar() {
    if (!cambio || enviando) return
    setEnviando(true)
    setError(null)
    try {
      if (cambio.tipo === 'asignar') await api.asignarRol(usuario.id, cambio.rol)
      else await api.revocarRol(usuario.id, cambio.rol)
      notifications.show({ color: 'green', message: cambio.tipo === 'asignar' ? 'Rol asignado.' : 'Rol revocado.' })
      setCambio(null)
      setElegido(null)
      onActualizado()
    } catch (e) {
      setError(mensajeRol(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Paper withBorder p="lg" radius="md">
      <Stack gap="sm">
        <Title order={2} size="h4">
          Roles
        </Title>
        {usuario.roles.length === 0 && <Text c="dimmed">Esta cuenta no tiene roles.</Text>}
        <Group gap="xs">
          {usuario.roles.map((rol) => (
            <Badge
              key={rol}
              size="lg"
              variant="light"
              rightSection={
                puedeGestionar && !(esPropia && rol === 'ADMIN_SISTEMA') ? (
                  <Button
                    variant="subtle"
                    size="compact-xs"
                    p={0}
                    aria-label={`Revocar el rol ${ETIQUETA_ROL[rol]}`}
                    onClick={() => setCambio({ tipo: 'revocar', rol })}
                  >
                    <IconX size={14} />
                  </Button>
                ) : null
              }
            >
              {ETIQUETA_ROL[rol]}
            </Badge>
          ))}
        </Group>
        {puedeGestionar && disponibles.length > 0 && (
          <Group align="flex-end" gap="sm">
            <Select
              label="Asignar rol"
              placeholder="Elige un rol"
              data={disponibles.map((r) => ({ value: r, label: ETIQUETA_ROL[r] }))}
              value={elegido}
              onChange={(v) => setElegido(v as CodigoRol | null)}
              w={{ base: '100%', sm: 260 }}
            />
            <Button
              leftSection={<IconPlus size={16} />}
              disabled={!elegido}
              onClick={() => elegido && setCambio({ tipo: 'asignar', rol: elegido })}
            >
              Asignar
            </Button>
          </Group>
        )}
      </Stack>

      <Modal
        opened={cambio !== null}
        onClose={() => {
          if (!enviando) {
            setCambio(null)
            setError(null)
          }
        }}
        title={cambio?.tipo === 'asignar' ? 'Asignar rol' : 'Revocar rol'}
        centered
      >
        {cambio && (
          <Stack gap="md">
            {textoConfirmacion(cambio, usuario).map((t) => (
              <Text key={t} size="sm">
                {t}
              </Text>
            ))}
            {error && (
              <Alert color="red" role="alert">
                {error}
              </Alert>
            )}
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setCambio(null)} disabled={enviando}>
                Cancelar
              </Button>
              <Button color={cambio.tipo === 'revocar' ? 'red' : undefined} loading={enviando} onClick={confirmar}>
                {cambio.tipo === 'asignar' ? 'Asignar' : 'Revocar'}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Paper>
  )
}
