// Medidor de fuerza (FRONT-00 §3): tres estados por regla, con texto e icono (no solo color).
// Informativo: no bloquea el envío, la validación real es del backend.
import { Alert, List, ThemeIcon } from '@mantine/core'
import { IconCheck, IconClock, IconX } from '@tabler/icons-react'
import type { PoliticaPassword } from '../shared/tipos'
import { evaluarReglas } from './reglasPassword'

const ICONO = {
  cumple: { color: 'green', icono: <IconCheck size={14} />, etiqueta: 'Cumple' },
  'no-cumple': { color: 'red', icono: <IconX size={14} />, etiqueta: 'No cumple' },
  'al-guardar': { color: 'gray', icono: <IconClock size={14} />, etiqueta: 'Se comprueba al guardar' },
} as const

export function MedidorPassword({ politica, valor, rechazadas }: {
  politica: PoliticaPassword | null
  valor: string
  rechazadas?: ReadonlySet<string>
}) {
  if (!politica) {
    return (
      <Alert color="gray" variant="light">
        No pudimos cargar las reglas de contraseña. Puedes continuar: las comprobaremos al guardar.
      </Alert>
    )
  }
  return (
    <List spacing={4} size="sm" aria-label="Requisitos de la contraseña">
      {evaluarReglas(politica, valor, rechazadas).map((r) => (
        <List.Item
          key={r.codigo}
          icon={
            <ThemeIcon color={ICONO[r.estado].color} size={18} radius="xl" aria-hidden>
              {ICONO[r.estado].icono}
            </ThemeIcon>
          }
        >
          {r.texto} — <em>{ICONO[r.estado].etiqueta}</em>
        </List.Item>
      ))}
    </List>
  )
}
