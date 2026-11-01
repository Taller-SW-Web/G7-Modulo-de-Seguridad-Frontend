// Rutas H3 (ENTORNO-Y-REACT §3) con React Router 7 en modo declarativo.
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import type { Api } from './shared/api'
import { Marco } from './shared/Marco'
import { PERMISO_VER_USUARIOS } from './shared/navegacion'
import { RutaAdmin, RutaAutenticada, RutaPublica } from './shared/rutas'
import { LoginPage } from './pantallas/login/LoginPage'
import { OtpPage } from './pantallas/otp/OtpPage'
import { DesbloqueoPage } from './pantallas/desbloqueo/DesbloqueoPage'
import { MiCuentaPage } from './pantallas/mi-cuenta/MiCuentaPage'
import { CambiarContrasenaPage } from './pantallas/cambio-contrasena/CambiarContrasenaPage'
import { ActividadPage } from './pantallas/actividad/ActividadPage'
import { AdminListadoPage } from './pantallas/admin-listado/AdminListadoPage'
import { AdminDetallePage } from './pantallas/admin-detalle/AdminDetallePage'
import { RecuperacionPage } from './pantallas/recuperacion/RecuperacionPage'
import { SegundoFactorPage } from './pantallas/segundo-factor/SegundoFactorPage'
import { RegistroPage } from './pantallas/registro/RegistroPage'
import { VerificacionCorreoPage } from './pantallas/verificacion/VerificacionCorreoPage'

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
        path="/registro"
        element={
          <RutaPublica>
            <RegistroPage api={api} />
          </RutaPublica>
        }
      />
      {/* Sin RutaPublica: con sesión abierta, FRONT-03 ofrece «Ir a Mi cuenta». */}
      <Route path="/verificar-correo" element={<VerificacionCorreoPage api={api} />} />
      <Route
        path="/recuperar-contrasena"
        element={<RecuperacionPage api={api} />}
      />
      <Route path="/desbloquear" element={<DesbloqueoPage api={api} />} />
      <Route
        path="/otp"
        element={
          <RutaPublica>
            <OtpPage api={api} />
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
        <Route path="/mi-cuenta" element={<MiCuentaPage api={api} />} />
        <Route path="/mi-cuenta/contrasena" element={<CambiarContrasenaPage api={api} />} />
        <Route path="/mi-cuenta/actividad" element={<ActividadPage api={api} />} />
        <Route path="/mi-cuenta/seguridad" element={<SegundoFactorPage api={api} />} />
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
