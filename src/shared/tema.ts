// Tema Mantine 9.6.2 del sistema de diseño (docs/diseno/sistema-diseno.md §2–§6).
// Los HEX ancla salen de la tabla de colores; las demás tonalidades los interpolan.
import { createTheme, type MantineColorsTuple } from '@mantine/core'

const volt: MantineColorsTuple = [
  '#FBFEE0', '#F5FCC2', '#EEF7B0', '#E1F27A', '#D3EC45', '#C3E504', '#A9C703', '#8DA602', '#748801', '#5C6B00',
]
const signal: MantineColorsTuple = [
  '#EEF0FE', '#E1E6FB', '#C3CCF8', '#A2B0F5', '#7F92F2', '#6179F0', '#4361EE', '#334ECB', '#263CB2', '#1B2A99',
]
const ink: MantineColorsTuple = [
  '#F5F4F2', '#DCD9D3', '#B9B4AA', '#8F897C', '#6A6457', '#4D483C', '#3A362C', '#2E2A21', '#26221A', '#1B1812',
]
const cloud: MantineColorsTuple = [
  '#FFFFFF', '#FBFAF7', '#F7F5F0', '#F2EFE8', '#EDEAE2', '#E6E2D8', '#DFDBCE', '#D6D2C4', '#C2BDAD', '#A9A391',
]

export const tema = createTheme({
  primaryColor: 'orange',
  primaryShade: 7,
  autoContrast: true,
  colors: { volt, signal, ink, cloud },
  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  headings: {
    fontFamily: 'Oswald, "Segoe UI", sans-serif',
    fontWeight: '700',
    textWrap: 'wrap',
    sizes: {
      h1: { fontSize: '2rem', lineHeight: '2.5rem' },
      h2: { fontSize: '1.75rem', lineHeight: '2.25rem' },
      h3: { fontSize: '1.5rem', lineHeight: '2rem' },
      h4: { fontSize: '1.25rem', lineHeight: '1.75rem' },
    },
  },
  fontSizes: { xs: '0.75rem', sm: '0.875rem', md: '1rem', lg: '1.125rem', xl: '1.25rem' },
  spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem' },
  radius: { xs: '0.25rem', sm: '0.5rem', md: '0.75rem', lg: '1rem', xl: '999px' },
  defaultRadius: 'sm',
})
