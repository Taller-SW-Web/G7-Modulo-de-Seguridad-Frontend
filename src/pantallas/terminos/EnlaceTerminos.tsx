// Enlace a los términos 2026-11-v1 desde la casilla de aceptación (H-12). Abre otra pestaña para no perder
// lo escrito en el formulario.
import { Anchor } from '@mantine/core'
import { Link } from 'react-router'

export function EnlaceTerminos() {
  return (
    <Anchor component={Link} to="/terminos" target="_blank" rel="noopener noreferrer" inherit>
      términos y condiciones
    </Anchor>
  )
}
