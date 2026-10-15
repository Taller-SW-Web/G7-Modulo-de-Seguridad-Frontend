// Rutas H3 (ENTORNO-Y-REACT §3) con React Router 7 en modo declarativo.
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import type { Api } from './shared/api'
import { Marco } from './shared/Marco'
import { RutaAutenticada, RutaPublica } from './shared/rutas'
import { LoginPage } from './pantallas/login/LoginPage'
import { MiCuentaBase } from './pantallas/mi-cuenta/MiCuentaBase'

export function Rutas({ api }: { api: Api }) {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RutaPublica>
            <LoginPage api={api} />
          </RutaPublica>
        }
      />
      <Route
        element={
          <RutaAutenticada>
            <Marco />
          </RutaAutenticada>
        }
      >
        <Route path="/mi-cuenta" element={<MiCuentaBase />} />
      </Route>
      <Route path="*" element={<Navigate to="/mi-cuenta" replace />} />
    </Routes>
  )
}

export default function App({ api }: { api: Api }) {
  return (
    <BrowserRouter>
      <Rutas api={api} />
    </BrowserRouter>
  )
}
