import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import './index.css'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { almacenSesion, api } from './shared/api'
import { ProveedorSesion } from './shared/sesion'
import { tema } from './shared/tema'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={tema} defaultColorScheme="light">
      <Notifications />
      <ProveedorSesion almacen={almacenSesion} api={api}>
        <App api={api} />
      </ProveedorSesion>
    </MantineProvider>
  </StrictMode>,
)
