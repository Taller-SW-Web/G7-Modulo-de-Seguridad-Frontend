# FEAT-12 — Evidencia de seguridad E2E (Hito 4) — frontend

**Tarea:** FEAT-12-T3 (suite E2E Playwright). **Rama:** `feat/EP-02-seguridad-e2e`
del frontend, base `develop` `e9cd51d`. **Estado:** implementada y con la
aceptación local **ejecutada en verde (6/6)** el 24-oct-2026 contra el stack de
pruebas local (PostgreSQL 16.15 + Mailpit v1.32 binarios, sin Docker) y
**re-ejecutada el 26-oct-2026 con las versiones del entorno anotadas** (sección
«Ejecución con versiones», abajo), para responder a la revisión del PR #17. Sigue
sin marcarse T3 Verificada: la comprobación en el despliegue queda para S3.

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

## Aceptación local ejecutada (24-oct-2026)

La aceptación («corre en local contra el stack de pruebas») se ejecutó sin
Docker, con binarios locales desechables en un directorio temporal del equipo:

- **PostgreSQL 16.15 portable**: clúster nuevo; esquema
  `docs/arquitectura/schema.sql` + migraciones `V101`–`V106` y `V108` (V107 ya
  venía en el esquema) y catálogos `R__catalogo_autorizacion`/`R__catalogo_scopes`,
  cada una en su transacción como Flyway.
- **Backend `bootRun` (JDK 21)** con secretos **generados en el momento y fuera
  del repo**: clave firmante PKCS8 3072, claves HMAC/AES por variable
  (`AUTH_OTP_HMAC_KEY*`, `AUTH_OUTBOX_AES_KEY*`, `AUTH_FALLOS_HMAC_KEY*`,
  `AUTH_SOLICITUD_LIMITADA_HMAC_KEY*`), contraseñas comunes en fichero local
  (`G7_PASSWORD_COMUNES_ARCHIVO`) y la contraseña de las cuentas fixture solo
  por `G7_FIXTURES_CUENTAS_CLAVE` (la misma se pasa a la suite como
  `E2E_CUENTAS_CLAVE`; ninguna viaja por Git). Correo saliente a
  `SPRING_MAIL_HOST/PORT` del receptor y remitente `*@fixtures.g7.test`.
- **Mailpit v1.32** (SMTP 1025, API 8025), del que la suite lee el OTP.

Resultado: **6/6 casos en verde en dos corridas consecutivas** (22.4 s y 11.5 s,
2 workers). Resumen de la última corrida:

```
ok 1 login cliente abre Mi cuenta (1.9s)
ok 2 refresh silencioso: la mutación renueva la sesión sin salir de la pantalla (3.2s)
ok 3 login admin completa el segundo factor con el código del receptor de correo (2.9s)
ok 4 logout cierra la sesión y la ruta autenticada vuelve a pedir login (2.1s)
ok 5 ruta privada sin sesión lleva al login y recuerda el destino (1.6s)
ok 6 ruta de administración con sesión de CLIENTE queda bloqueada sin pedir datos (2.1s)
6 passed (11.5s)
```

El informe HTML queda en `playwright-report/` (gitignored; se regenera con
`npm run e2e` o `npm run e2e:informe`). Compuertas en verde: `typecheck`,
`lint`, `build` y Vitest 98/98.

Correcciones aplicadas durante la ejecución (los specs vivían solo de revisión
estática hasta entonces):

- Selectores del login por `getByRole('textbox', …)`: `getByLabel` era ambiguo
  con el botón «Mostrar contraseña» y con el `*` de requerido del `<label>` de
  Mantine (el nombre accesible sí es «Correo»/«Contraseña»).
- Navegación **dentro de la SPA** en los tests con sesión: los tokens viven solo
  en memoria, así que `page.goto` (recarga) perdía la sesión; se usa el enlace
  real de Mi cuenta y, para `/admin/usuarios`, `pushState` + `popstate`.
- El modal del cambio de segundo factor se afirma por su heading: el párrafo
  «Confirma el cambio con un código enviado a tu correo.» del cuerpo hacía
  ambiguo `getByText('Confirma el cambio')`.

Comportamiento acreditado de paso: el login con MFA entrega primero el desafío
y el código se pide con `POST /auth/otp/solicitar`; el reenvío del cambio de
segundo factor renueva la sesión antes de enviar (`POST /auth/refresh` observado
y Authorization distinto en el reenvío), sin salir de la pantalla.

## Ejecución con versiones (31-oct-2026)

Ejecución contra el stack real levantado para avanzar la T4: PostgreSQL 16.15 (binario portable, sin Docker) + Mailpit v1.32 (SMTP 1025 / API 8025) + backend `bootRun` @ `76e248f` con OpenJDK 21.0.12+1; SPA por `vite dev` con proxy `/api` → `:8080`. Sin Docker, binarios locales desechables.

| Componente | Versión / corte |
|---|---|
| Sistema | Windows x86_64 (shell Git-bash), kernel 10.0-26200 |
| Node / npm | v24.21.0 / 11.19.0 |
| Playwright | 1.64.1 |
| Navegador | Chromium «Chrome for Testing» 156.0.8078.4 (`chromium-1248`) |
| PostgreSQL | 16.15 (binario portable, sin Docker) |
| Receptor SMTP/API | Mailpit v1.32.0 (`go1.27.3`, `windows/amd64`), SMTP 1025 / API 8025 |
| Backend bajo prueba | `Modulo-de-Seguridad-Backend`, rama `feat/EP-02-seguridad-e2e` @ `76e248f`, `bootRun` OpenJDK 21.0.12+1 |
| SPA bajo prueba | este repositorio, rama `feat/EP-02-seguridad-e2e`, `vite dev` con proxy `/api` → `:8080` |

Comando (los secretos solo por variables de entorno, ninguno vive en el repo):

```bash
export E2E_CUENTAS_CLAVE='…'    # valor en la terminal/gestor, nunca en Git
npx playwright test             # 6 casos, 2 workers, baseURL http://localhost:5173
```

Resultado — **6/6 en verde** (16.5 s):

```
Running 6 tests using 2 workers
  ok 1 login cliente abre Mi cuenta (3.5s)
  ok 2 refresh silencioso: la mutación renueva la sesión sin salir de la pantalla (4.5s)
  ok 4 logout cierra la sesión y la ruta autenticada vuelve a pedir login (2.0s)
  ok 3 login admin completa el segundo factor con el código del receptor de correo (3.6s)
  ok 5 ruta privada sin sesión lleva al login y recuerda el destino (1.5s)
  ok 6 ruta de administración con sesión de CLIENTE queda bloqueada sin pedir datos (2.2s)
  6 passed (16.5s)
```

Compuertas en el mismo corte: `npm run typecheck` y `npm run lint` sin errores, `npm run build` ✓ y `npm test` (Vitest) **98/98**.

El informe HTML completo queda en `playwright-report/` (gitignored, se regenera con `npm run e2e:informe`); este bloque es su resumen sanitizado. La acreditación de esta ejecución **en el CI** corresponde a FEAT-12-T4 (job E2E), que hoy puede arrancar porque Christian ya tiene FEAT-09-T1 y FEAT-09-T2 merged en `main`.

## Ejecución con versiones (26-oct-2026)

Re-ejecución pedida en la revisión del PR #17 («ejecutar los seis casos contra el
stack real y adjuntar el resultado con las versiones utilizadas»), con el stack real
levantado de nuevo: PostgreSQL, backend `bootRun` y Mailpit, binarios locales
desechables (sin Docker).

| Componente | Versión / corte |
|---|---|
| Sistema | Windows x86_64 (shell Git-bash), kernel 10.0-26200 |
| Node / npm | v24.21.0 / 11.19.0 |
| Playwright | 1.64.1 |
| Navegador | Chromium «Chrome for Testing» 156.0.8078.4 (paquete `chromium-1248`) |
| PostgreSQL | 16.15 (binario portable, sin Docker) |
| Receptor SMTP/API | Mailpit v1.32.0 (`go1.27.3`, `windows/amd64`), SMTP 1025 / API 8025 |
| Backend bajo prueba | `Modulo-de-Seguridad-Backend`, rama `feat/EP-02-seguridad-e2e` @ `76e248f` (incluye el merge de `develop` del 26-oct), `bootRun` con OpenJDK 21.0.12+1 |
| SPA bajo prueba | este repositorio, rama `feat/EP-02-seguridad-e2e`, `vite dev` con proxy `/api` → `:8080` |

Comando (los secretos solo por variables de entorno, ninguno vive en el repo):

```bash
export E2E_CUENTAS_CLAVE='…'    # valor en la terminal/gestor, nunca en Git
npx playwright test             # 6 casos, 2 workers, baseURL http://localhost:5173
```

Resultado — **6/6 en verde**:

```
Running 6 tests using 2 workers
  ok 1 login cliente abre Mi cuenta (1.2s)
  ok 2 refresh silencioso: la mutación renueva la sesión sin salir de la pantalla (2.3s)
  ok 4 logout cierra la sesión y la ruta autenticada vuelve a pedir login (1.2s)
  ok 3 login admin completa el segundo factor con el código del receptor de correo (2.5s)
  ok 6 ruta privada sin sesión lleva al login y recuerda el destino (884ms)
  ok 5 ruta de administración con sesión de CLIENTE queda bloqueada sin pedir datos (1.4s)
  6 passed (6.7s)
```

La corrida inmediatamente anterior, hecha **sin reiniciar la cuota**, falló 1 de 6 con
el aviso del servidor «Espera el tiempo indicado antes de pedir otro código.»:
`cliente.a` acumuló 3 solicitudes `CAMBIO_MFA` en 15 minutos (cuota comprobada en la
BD local), el límite que `e2e/README.md` §Notas ya advertía al apilar ejecuciones.
Reiniciada la cuota (`DELETE FROM otp; DELETE FROM desafio_mfa;`, solo en la BD
desechable), la suite volvió a 6/6 (6.7 s) y una corrida final de confirmación volvió
a **6/6 (6.8 s)**. No es un defecto de la SPA sino el límite de frecuencia del backend
de pruebas.

Compuertas en el mismo corte: `npm run typecheck` y `npm run lint` sin errores,
`npm run build` `✓ built in 8.16s`, `npm test` (Vitest) **98/98**.

El informe HTML completo de esta corrida queda en `playwright-report/` (gitignored,
se regenera con `npm run e2e:informe`); este bloque es su resumen sanitizado. La
acreditación de esta ejecución **en el CI** corresponde a FEAT-12-T4 (job E2E), hoy
bloqueada por FEAT-09-T1/T2.

## Pendiente para Verificada

- **Comprobación en el entorno de integración S3** (plan H4 §flujo, punto 4), junto con T1/T2:
  - **T1**: `iss` de un token real desplegado == `issuer` del discovery de ese entorno. Requiere credenciales por canal seguro para obtener el token y comparar con el `issuer` público del JWKS desplegado.
  - **T2**: Captura de la actividad `SESION_CERRADA` en `/auth/me/actividad` tras cerrar sesión; un logout repetido no duplica el hecho.
  - **T3**: Acreditación de la suite E2E Playwright contra el mismo despliegue (login cliente; login admin con OTP leído por receptor; refresh silencioso con `page.clock` +900 s; logout; ruta `/admin/usuarios` con CLIENTE bloqueada sin llamar a `GET /usuarios`; ruta privada sin sesión → `/login?volver=…`). La evidencia local ya está cubierta (24-oct y 31-oct corridas 6/6).
- **Capturas del despliegue y el informe del job de FEAT-12-T4**: evidencia del job E2E en CI contra el despliegue, con reporte HTML subido como artefacto.

## Observación (no bloqueante)

El guard `RutaAdmin` muestra «Acceso restringido» con el mensaje de `MENSAJES.permiso` («No tienes permiso para realizar esta acción.»); FRONT-00 §1.4 pide «No tienes permiso para ver esta página.». El caso E2E acredita el comportamiento real (alerta y cero llamadas al endpoint); la diferencia de redacción queda anotada para el dueño de la pantalla.

## Observación (no bloqueante)

El guard `RutaAdmin` muestra «Acceso restringido» con el mensaje de
`MENSAJES.permiso` («No tienes permiso para realizar esta acción.»); FRONT-00
§1.4 pide «No tienes permiso para ver esta página.». El caso E2E acredita el
comportamiento real (alerta y cero llamadas al endpoint); la diferencia de
redacción queda anotada para el dueño de la pantalla.
