// Términos de uso 2026-11-v1 (decisión H-12 del PO, plan/hito-5/DECISIONES-PO.md): página propia enlazada
// desde el registro (FRONT-02) y la activación (FEAT-13). Copia fiel de docs/legal/terminos-2026-11-v1.md
// del repositorio de documentación; si el texto cambia, se publica una versión nueva y se cambia aquí.
import { Container, Paper, Stack, Text, Title } from '@mantine/core'

export const VERSION_TERMINOS = '2026-11-v1'

const SECCIONES: readonly { titulo: string; texto: string }[] = [
  {
    titulo: '1. Qué es esta plataforma.',
    texto: 'Es el marketplace multicanal de productos deportivos que desarrollan estudiantes del curso Taller de '
      + 'Construcción de Software Web de la UNMSM, ciclo 2026-II. Es un proyecto académico: no vende productos '
      + 'reales ni procesa pagos reales.',
  },
  {
    titulo: '2. Tu cuenta.',
    texto: 'Una misma cuenta te identifica en todos los canales de la plataforma. Eres responsable de tu contraseña '
      + 'y de lo que se haga con tu cuenta. Si crees que alguien más la usó, cambia tu contraseña.',
  },
  {
    titulo: '3. Qué datos guardamos.',
    texto: 'Tu correo, nombres, apellidos y celular. Si los registras, también tu documento y tus direcciones de '
      + 'entrega. Guardamos además un registro de seguridad de tu cuenta: inicios de sesión, cambios de contraseña '
      + 'y bloqueos.',
  },
  {
    titulo: '4. Para qué los usamos.',
    texto: 'Para identificarte, proteger tu cuenta y permitir que los demás módulos de la plataforma atiendan tus '
      + 'pedidos. No los usamos para publicidad ni los entregamos a terceros fuera del curso.',
  },
  {
    titulo: '5. Cómo los protegemos.',
    texto: 'Tu contraseña no se guarda en claro. Tu documento se guarda cifrado. Los demás módulos solo reciben los '
      + 'datos que necesitan.',
  },
  {
    titulo: '6. Tus derechos.',
    texto: 'Puedes ver y corregir tus datos desde «Mi cuenta», y pedir la baja de tu cuenta al administrador de la '
      + 'plataforma, conforme a la Ley N.º 29733 de Protección de Datos Personales.',
  },
  {
    titulo: '7. Fin del proyecto.',
    texto: 'Al terminar el curso, los datos de prueba se eliminan.',
  },
  {
    titulo: '8. Cambios.',
    texto: 'Si este texto cambia, se publica una versión nueva y se te pide aceptarla.',
  },
]

export function TerminosPage() {
  return (
    <Container size="sm" py="xl">
      <Paper withBorder shadow="sm" p="xl" radius="md">
        <Stack gap="md">
          <Title order={1} size="h3">Términos de uso</Title>
          <Text size="sm" c="dimmed">Versión {VERSION_TERMINOS}, vigente desde el 10 de noviembre de 2026.</Text>
          {SECCIONES.map((s) => (
            <Text key={s.titulo}>
              <strong>{s.titulo}</strong> {s.texto}
            </Text>
          ))}
        </Stack>
      </Paper>
    </Container>
  )
}
