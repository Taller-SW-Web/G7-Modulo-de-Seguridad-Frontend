# Pruebas E2E de la SPA (FEAT-12-T3)

Suite Playwright de la FEAT-12 (`feat/EP-02-seguridad-e2e`): login de cliente,
login de administración con OTP leído del receptor de correo de pruebas,
renovación silenciosa, logout y guards de ruta (sin sesión y sin permiso).
Fuentes: plan H4 §3, tablero `tareas/hito-4/jose-limachi/TAREAS.md`, FRONT-00,
FRONT-01 y FRONT-04.

## Casos

| Caso | Spec | Qué comprueba |
|---|---|---|
| `login cliente abre Mi cuenta` | FRONT-01 UI-01.1 | Destino por defecto de un CLIENTE |
| `login admin completa el segundo factor…` | FRONT-04 UI-04.1 | `/otp` + código de 6 dígitos leído del receptor → panel de administración |
| `ruta privada sin sesión lleva al login…` | FRONT-00 §1.4 | `/login?volver=…` y regreso al destino tras iniciar sesión |
| `refresh silencioso…` | FRONT-00 UI-00.1 | `POST /auth/refresh` previo a una mutación, con token nuevo y sin salir de la pantalla |
| `logout cierra la sesión…` | FRONT-00 §1.3 | `POST /auth/logout`, aviso «Cerraste sesión.» y redirección posterior |
| `ruta de administración con sesión de CLIENTE…` | FRONT-00 UI-00.6 | Alerta de permiso sin ninguna llamada a `GET /usuarios` |

## Requisitos

- Node 22 ≥ 22.12 (repo) y el backend del curso compilado con JDK 21.
- Stack de pruebas levantado (ver abajo): PostgreSQL, backend con cuentas
  fixture y receptor de correo SMTP/API.
- `npx playwright install chromium` la primera vez (navegador de pruebas).

## 1. Stack de pruebas

```bash
# PostgreSQL 16 + receptor de correo (Mailpit: SMTP 1025, API 8025)
docker compose -f e2e/stack.yml up -d
```

1. **Esquema**: crear la base y aplicar el esquema base
   `docs/arquitectura/schema.sql` del repositorio SDD (`Modulo-de-Seguridad`);
   después el baseline explícito `100` y las migraciones `V101+` tal como
   describe `docs/migraciones-propuestas/VENTANA-T002-runbook.md` §1–§2 del
   backend (o el perfil `migration`). Con una base vacía el runtime no arranca:
   `spring.jpa.hibernate.ddl-auto=validate`.
2. **Backend** (`Modulo-de-Seguridad-Backend`, `.\gradlew.bat bootRun`, JDK 21):
   las variables de `README.md`/`.env.example` (`DB_JDBC_URL` local sin TLS,
   `AUTH_ISSUER` + clave PKCS8 generada fuera del repo) y además:

   | Variable | Valor para E2E |
   |---|---|
   | `G7_FIXTURES_CUENTAS_HABILITADAS` | `true` |
   | `G7_FIXTURES_CUENTAS_CLAVE` | la misma contraseña que `E2E_CUENTAS_CLAVE` |
   | `SPRING_MAIL_HOST` / `SPRING_MAIL_PORT` | `localhost` / `1025` (el receptor) |

   Si `G7_FIXTURES_CUENTAS_CORREO_ADM` apunta a otro buzón del ADM,
   `E2E_CORREO_ADMIN` debe coincidir. RabbitMQ no hace falta
   (`G7_EVENTOS_PUBLICAR` por defecto `false`).
3. **SPA**: si `E2E_BASE_URL` no está definida, Playwright arranca `vite dev`
   solo; el proxy `/api` → `G7_BACKEND_URL` (por defecto `http://localhost:8080`)
   evita CORS.

## 2. Ejecutar la suite

```bash
export E2E_CUENTAS_CLAVE='…'   # o $env:E2E_CUENTAS_CLAVE en PowerShell
npm run e2e                    # informe: npm run e2e:informe
```

| Variable | Obligatoria | Defecto |
|---|---|---|
| `E2E_CUENTAS_CLAVE` | sí | — (sin ella los tests fallan avisándolo) |
| `E2E_BASE_URL` | no | `http://localhost:5173` (arranca `vite dev`) |
| `E2E_CORREO_CLIENTE` | no | `cliente.a@fixtures.g7.test` |
| `E2E_CORREO_ADMIN` | no | `admin@fixtures.g7.test` |
| `E2E_CORREO_API` | no | `http://localhost:8025` |

Ninguna credencial vive en el repo: las cuentas son fixtures (`@fixtures.g7.test`)
y la contraseña solo viaja por variable de entorno. El receptor debe exponer la
API de Mailpit (`/api/v1/messages`, `/api/v1/message/{id}`).

## Notas

- El informe HTML queda en `playwright-report/` y las trazas de fallo en
  `test-results/` (ignorados por Git); la evidencia resumida se adjunta en
  `docs/evidencia/h4/FEAT-12.md`.
- El OTP del caso de administración consume cuota (`DEMASIADAS_SOLICITUDES`):
  no apilar ejecuciones ni reintentos alocados contra la misma cuenta.
- El caso de *refresh* adelanta el reloj del navegador (`page.clock`); no
  modifica datos de las cuentas (el cambio de segundo factor se cancela antes
  de confirmar).
