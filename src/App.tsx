// Rutas H3 (ENTORNO-Y-REACT §3) con React Router 7 en modo declarativo.
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import type { Api } from './shared/api'
import { Marco } from './shared/Marco'
import { PERMISO_VER_USUARIOS } from './shared/navegacion'
import { RutaAdmin, RutaAutenticada, RutaPublica } from './shared/rutas'
import { LoginPage } from './pantallas/login/LoginPage'
import { MiCuentaBase } from './pantallas/mi-cuenta/MiCuentaBase'
import { AdminListadoPage } from './pantallas/admin-listado/AdminListadoPage'
import { AdminDetallePage } from './pantallas/admin-detalle/AdminDetallePage'

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
        <Route
          path="/admin/usuarios"
          element={
            <RutaAdmin permiso={PERMISO_VER_USUARIOS}>
              <AdminListadoPage api={api} />
            </RutaAdmin>
          }
        />
        <Route
          path="/admin/usuarios/:id"
          element={
            <RutaAdmin permiso={PERMISO_VER_USUARIOS}>
              <AdminDetallePage api={api} />
            </RutaAdmin>
          }
        />
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
