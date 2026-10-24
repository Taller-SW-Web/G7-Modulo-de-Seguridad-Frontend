# FEAT-12 — Evidencia de seguridad E2E (Hito 4) — frontend

**Tarea:** FEAT-12-T3 (suite E2E Playwright). **Rama:** `feat/EP-02-seguridad-e2e`
del frontend, base `develop` `e9cd51d`. **Estado:** implementada y verificada en
local hasta donde permite esta máquina; la ejecución completa contra el stack de
pruebas queda **pendiente** (sin Docker/PostgreSQL en el equipo). No se marca T3
Verificada.

## Revisión documental consumida

- Fuentes SDD: plan H4 v1.2 §3 y `tareas/hito-4/jose-limachi/TAREAS.md`;
  FRONT-00 (§1.1–§1.4, UI-00.1, UI-00.6), FRONT-01 (UI-01.1, UI-01.5) y
  FRONT-04 (UI-04.1); `CONTEXT.md`; `plan/hito-3/ENTORNO-Y-REACT.md` §3–§4.
- Backend (solo lectura, para definir el stack): cuentas fixture
  `CargaCuentasPrueba` (A `cliente.a` sin MFA; ADM `admin` con MFA efectivo por
  rol de gestión), entrega de OTP `EntregaOtpSmtp` (asunto «Tu código de
  verificación», cuerpo con código de 6 dígitos), README backend (firma local,
  `.env.example`), `application-migration.properties` y runbook
  `VENTANA-T002-runbook.md` §1–§2 (esquema base + baseline 100 + V101+).

## Implementación

| Archivo | Contenido |
|---|---|
| `playwright.config.ts` | Chromium, informe HTML, `E2E_BASE_URL` opcional; sin ella arranca `vite dev` (proxy `/api` → backend local, sin CORS) |
| `e2e/ayudas.ts` | Cuentas fixture por variables (`E2E_CUENTAS_CLAVE` obligatoria, sin defecto) y lector del OTP por la API HTTP del receptor (compatible Mailpit) |
| `e2e/inicio-sesion.spec.ts` | login cliente → *Mi cuenta*; login admin con OTP leído del receptor → `/admin/usuarios`; ruta privada sin sesión → `/login?volver=…` y regreso tras iniciar sesión |
| `e2e/sesion-y-permisos.spec.ts` | refresh silencioso con `page.clock` (+900 s): se observa `POST /auth/refresh` y que el reenvío viaja con un token **distinto**, sin salir de la pantalla; logout con `POST /auth/logout`, aviso y redirección; guard `/admin/usuarios` con CLIENTE sin ninguna llamada a `GET /usuarios` |
| `e2e/stack.yml` | Stack auxiliar: PostgreSQL 16 + Mailpit v1.32 (SMTP 1025, API 8025) |
| `e2e/README.md` | Receta del stack, variables de entorno y ejecución |

Los seis casos pedidos en el tablero están cubiertos. Ningún caso muta el estado
de las cuentas fixture (el cambio de segundo factor se cancela antes de
confirmar) y ningún secreto vive en el repo: correos `*@fixtures.g7.test` y la
contraseña solo por `E2E_CUENTAS_CLAVE`.

## Verificación local (24-oct-2026)

- `npm run typecheck` y `npm run lint`: sin errores (incluye `e2e/` y
  `playwright.config.ts` por `tsconfig.e2e.json`).
- `npm run build`: `✓ built in 13.27s`.
- `npm test` (Vitest): 16 archivos, **98 pruebas en verde**; los specs de
  `e2e/` quedan excluidos de Vitest en `vite.config.ts`.
- `npx playwright test --list`: **6 casos en 2 ficheros**.
- Chromium (Playwright 1.64.1) instalado y *smoke* ejecutado con éxito: la SPA
  carga bajo `page.clock.install`, `fastForward` adelanta el reloj ≈15 min y los
  localizadores de FRONT-01 responden. (El smoke fue temporal y se retiró.)

## Pendiente para Verificada

- Ejecución completa de la suite contra el stack de pruebas (aceptación: «corre
  en local»): esta máquina no tiene Docker ni PostgreSQL; el stack auxiliar
  (`e2e/stack.yml`) y la receta (`e2e/README.md`) quedan listos para quien
  disponga de Docker, y también sirve de base al job de FEAT-12-T4.
- Reporte HTML de Playwright y capturas como evidencia de la ejecución.

## Observación (no bloqueante)

El guard `RutaAdmin` muestra «Acceso restringido» con el mensaje de
`MENSAJES.permiso` («No tienes permiso para realizar esta acción.»); FRONT-00
§1.4 pide «No tienes permiso para ver esta página.». El caso E2E acredita el
comportamiento real (alerta y cero llamadas al endpoint); la diferencia de
redacción queda anotada para el dueño de la pantalla.
