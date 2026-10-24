# Evidencia local — FEAT-03-T4

- **Fecha:** 22-oct-2026 (Lima).
- **Repositorio y rama:** `G7-Modulo-de-Seguridad-Frontend`, `EP-03-recuperacion`.
- **Base local:** `develop`, commit `82c94149c8e2326d3d6013a167026a6b38d75b4a`.
- **Fuentes H4:** clon documental `Modulo-de-Seguridad`, revisión `aeb477c491826dd4801f95c2e3d996f9d25ac5f7`.
- **Tarea:** FEAT-03-T4, pantallas FRONT-05. No incluye FEAT-03-T5 ni cambios de backend.

## Criterios implementados

- Enlace «¿Olvidaste tu contraseña?» en el login y formulario de solicitud con correo prellenado desde el estado de navegación.
- Mensaje 202 neutral, con el correo indicado, la vigencia de 30 minutos y el efecto de pedir otro enlace; respuesta 429 bloquea nuevos envíos en la pantalla actual; otros errores usan el catálogo común.
- Formulario de restablecimiento con medidor de política, confirmación local de contraseña y validación 422; la confirmación no se envía.
- El token se conserva solo en memoria de la pantalla y se elimina de la barra de direcciones al abrir el enlace. Se envía solo al guardar.
- Errores de enlace inválido/vencido ocultan el formulario y permiten cambiar a solicitud de un enlace nuevo. El éxito borra la sesión local y vuelve al login con el aviso especificado.
- Recuperación accesible con sesión local previa, `autocomplete="new-password"` en ambos campos y foco en la confirmación 202 / acción al llegar por contraseña caducada.

## Verificación ejecutada

Entorno local: Node.js 22.16.0, npm 10.9.2. Dependencias instaladas desde `package-lock.json` con `npm ci`.

- `npm run typecheck` — correcto.
- `npm run lint` — correcto.
- `npm run build` — correcto; Vite informa que el bundle principal supera 500 kB minificados.
- `npm test` — 12 archivos, 67 pruebas aprobadas, 0 fallos.
- Las once pruebas nuevas cubren acceso desde login, mensaje 202, token retirado de la URL, llegada por contraseña caducada, 429, 503 y caída de red con reintento, confirmación local, 422/medidor, token inválido/expirado y sesión limpiada al completar.

## Comprobación complementaria del backend local

En el clon backend, rama `feat/EP-03-recuperacion`, commit `37f2c76211b2a6352268207abc40289b3ff38d6e`, ejecuté con JDK 21.0.12.1:

- `gradlew.bat test --no-daemon --console=plain --tests '*SolicitarRecuperacionHttpTest' --tests '*SolicitudesRecuperacionPostgresTest' --tests '*RestablecerContrasenaServiceTest' --tests '*TokenUnUsoJpaPostgresTest'` — 20 pruebas aprobadas, 0 fallos/errores. Incluye HTTP de ambos endpoints, cuota y persistencia PostgreSQL en Testcontainers.
- `gradlew.bat test --no-daemon --console=plain --tests '*SolicitudRecuperacionServiceTest'` — 5 pruebas aprobadas, 0 fallos/errores.

Las pruebas HTTP del backend usan puertos simulados; las pruebas PostgreSQL automatizadas verifican adaptadores en contenedores efímeros. Además, el 22-oct-2026 se intentó el recorrido conectado local con Edge headless, el backend real y una base PostgreSQL 16.6 desechable inicializada desde `src/test/resources/mfa/base-observada/schema.sql` y las migraciones locales V101–V106. V107 no se reaplicó porque la fixture ya contiene `perfil_cliente.documento_hmac`.

- El navegador envió la solicitud al backend real; respondió **202**.
- Mailpit recibió el correo de prueba por SMTP y el enlace abrió la pantalla de restablecimiento.
- Al guardar la contraseña, el backend respondió **401 `TOKEN_RECUPERACION_INVALIDO`**. La interfaz mostró el estado de enlace inválido; no se completó el cambio ni se probó el inicio de sesión con la contraseña nueva.
- La comprobación diagnóstica en el contexto Spring local encontró el último token emitido mediante `TokensUnUsoPort`; el token recibido por correo corresponde al hash vigente y no consumido en la base desechable. La causa del 401 queda pendiente de aislar en el flujo de restablecimiento.

Resultado: **recorrido real parcial, no aprobado**. No se usó Supabase ni un servicio de correo externo. Esta prueba no sustituye la validación del entorno desplegado prevista para FEAT-03-T5.
