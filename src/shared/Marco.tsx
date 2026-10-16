// Marco común de las pantallas con sesión: encabezado, navegación permitida y cierre de sesión.
import { AppShell, Button, Group, Text, ThemeIcon } from '@mantine/core'
import { IconLogout, IconShieldLock } from '@tabler/icons-react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { PERMISO_VER_USUARIOS } from './navegacion'
import { useSesion } from './sesion'

export function Marco() {
  const { estado, tienePermiso, cerrarSesion } = useSesion()
  const navegar = useNavigate()
  const nombre = estado.tipo === 'activa' ? estado.usuario.nombreCompleto : ''

  async function salir() {
    await cerrarSesion()
    navegar('/login', { replace: true })
  }

  return (
    <AppShell header={{ height: 64 }} padding="md">
      <AppShell.Header bg="ink.9" c="cloud.2" px="md">
        <Group h="100%" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon color="signal" variant="filled" radius="sm" aria-hidden>
              <IconShieldLock size={18} />
            </ThemeIcon>
            <Text fw={700} ff="heading" tt="uppercase" visibleFrom="xs">
              Centro de Seguridad
            </Text>
            <Group gap="xs" component="nav" aria-label="Principal" ml="md">
              <Button component={NavLink} to="/mi-cuenta" variant="subtle" color="cloud" size="compact-sm">
                Mi cuenta
              </Button>
              {tienePermiso(PERMISO_VER_USUARIOS) && (
                <Button component={NavLink} to="/admin/usuarios" variant="subtle" color="cloud" size="compact-sm">
                  Usuarios
                </Button>
              )}
            </Group>
          </Group>
          <Group gap="sm" wrap="nowrap">
            <Text size="sm" visibleFrom="sm" truncate maw={220}>
              {nombre}
            </Text>
            <Button
              variant="outline"
              color="cloud"
              size="compact-sm"
              leftSection={<IconLogout size={16} />}
              onClick={salir}
            >
              Cerrar sesión
            </Button>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Main bg="cloud.2">
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}
