// Contenedor de /mi-cuenta con los datos de la sesión. La pantalla FRONT-06
// (GET /auth/me y edición propia) es de Valery (EP-08-T005) y reemplaza este contenido.
import { Badge, Container, Group, Paper, Stack, Text, Title } from '@mantine/core'
import { useSesion } from '../../shared/sesion'

export function MiCuentaBase() {
  const { estado } = useSesion()
  if (estado.tipo !== 'activa') return null
  const { usuario } = estado
  return (
    <Container size="sm" py="lg">
      <Paper withBorder p="lg" radius="md">
        <Stack gap="sm">
          <Title order={1} size="h3">
            Mi cuenta
          </Title>
          <Text fw={600}>{usuario.nombreCompleto}</Text>
          <Text c="dimmed">{usuario.correo}</Text>
          <Group gap="xs">
            {usuario.roles.map((rol) => (
              <Badge key={rol} variant="light">
                {rol}
              </Badge>
            ))}
          </Group>
        </Stack>
      </Paper>
    </Container>
  )
}
