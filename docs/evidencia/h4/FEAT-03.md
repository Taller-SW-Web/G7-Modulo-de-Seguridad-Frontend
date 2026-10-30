# FEAT-03 — Evidencia de recuperación de contraseña (Hito 4)

**Estado:** recorrido integrado local aprobado; aceptación desplegada y prueba conjunta con G1 pendientes. No se marca la FEAT completa.

## Ramas y fuentes

- Backend: `feat/EP-03-recuperacion`, commit `37f2c76211b2a6352268207abc40289b3ff38d6e`; base local `develop` `813b8099a59974c172d95a0b45b23d125e58caa6`, que incluye T1 por PR #58.
- Frontend: `feat/EP-03-recuperacion`, commit `1b9f268f6f47c51dbf880fe33cab13f91b7bb174`; base local `develop` `82c94149c8e2326d3d6013a167026a6b38d75b4a`.
- Fuentes H4 consultadas: plan H4 v1.2 y `tareas/hito-4/juan-cano/TAREAS.md`; SPEC-07, SPEC-08, FRONT-05, OpenAPI v1 y catálogo de errores.

## Verificación de implementación

- FEAT-03-T1 está integrada en el `develop` local por PR #58. T2 y T3 están implementadas en la rama backend; T4 en la rama frontend. Las ramas de trabajo no recibieron commits ni push en esta verificación.
- `gradlew.bat --no-daemon --console=plain clean build` con Microsoft JDK 21.0.12.1: `BUILD SUCCESSFUL`, 827 pruebas en 111 suites, 0 fallos, 0 errores y 0 omitidas.
- Con Microsoft JDK 21.0.12.1, `gradlew.bat --no-daemon --console=plain test --tests '*CambioContrasenaPostgresTest' --rerun-tasks`: `BUILD SUCCESSFUL`, 5/5 pruebas. Incluye restablecimiento por puerto real con PostgreSQL, historial, token de un uso, revocación de sesiones, preservación de bloqueo manual, eliminación del bloqueo automático y rechazo de reuso.
- Frontend: `npm run typecheck`, `npm run lint`, `npm test -- --run` (12 archivos, 67/67 pruebas) y `npm run build` aprobados. Vite mantiene el aviso conocido de bundle principal mayor de 500 kB.

## Recorrido local integrado

El 23-oct-2026 se ejecutó el flujo desde la interfaz React en Microsoft Edge headless, con Vite apuntando explícitamente a `http://localhost:8080/api/v1`, el backend de la rama, PostgreSQL 16.6 desechable y Mailpit local. La base se inicializó con la fixture `src/test/resources/mfa/base-observada/schema.sql` y las migraciones locales V101–V106. Se usaron únicamente cuentas y contraseñas sintéticas de la fixture; no se usaron Supabase ni servicios de correo externos.

1. Desde login, la SPA solicitó el enlace; el backend respondió HTTP 202.
2. Mailpit recibió el correo de prueba. Se abrió su enlace en la SPA y el token se retiró de la barra de direcciones.
3. El formulario envió la contraseña nueva; el backend respondió HTTP 204.
4. Desde login, la misma cuenta inició sesión con la contraseña nueva; el backend respondió HTTP 200.

El 401 `TOKEN_RECUPERACION_INVALIDO` del intento del 22-oct no se reprodujo en este recorrido completo. No se aisló retrospectivamente la causa de ese intento anterior; por ello esta evidencia registra la repetición aprobada sin atribuir causa al 401 anterior.

Capturas sanitizadas del recorrido local:

- [Solicitud aceptada](FEAT-03-solicitud.png) — correo sintético ocultado en la captura.
- [Contraseña restablecida](FEAT-03-restablecida.png) — aviso de éxito antes de iniciar sesión.
- [Sesión iniciada](FEAT-03-sesion.png) — cuenta sintética de prueba, sin tokens visibles.

## Estado del despliegue y aceptación con G1

Comprobación pública de solo lectura el 23-oct-2026:

- `https://g7-seguridad-spa.onrender.com/login`: HTTP 200.
- `https://g7-auth-service.onrender.com/actuator/health` y `https://g7-auth-service.onrender.com/api/v1/password/politica`: no respondieron con HTTP dentro de 20 segundos.
- No se confirmó el SHA servido por el backend ni por el frontend. No se ejecutaron solicitudes de recuperación ni se modificaron cuentas desplegadas.
- La repetición F-004/F-005 con G1 requiere ventana y cuentas/buzones de prueba coordinados con David/G1. No se hizo esa coordinación en nombre del usuario.

FEAT-03-T5 continúa pendiente de la verificación en el despliegue con SHAs identificados y de la prueba conjunta con G1. No se aplicaron migraciones remotas ni se hicieron commits o push.
