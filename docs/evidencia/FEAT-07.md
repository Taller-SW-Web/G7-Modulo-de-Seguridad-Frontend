# FEAT-07 Pantalla del segundo factor

Corte: 20-oct-2026, America/Lima. Luis David Morales Brenis.
Estado: implementación publicada en PR #11; correcciones de auditoría preparadas localmente, **no verificada en despliegue**.

Fuente documental: main `029171b61335ec0412af777c2d8a0559d8dadb16` (#64),
SPEC-10, FRONT-09 e interfaz React, OpenAPI v2 2.0.0 y convenciones compartidas.
Base frontend: develop `82c94149c8e2326d3d6013a167026a6b38d75b4a`.
Rama: `feat/EP-04-mfa-v2`; [PR frontend #11](https://github.com/Taller-SW-Web/G7-Modulo-de-Seguridad-Frontend/pull/11), dependiente del [PR backend #57](https://github.com/Taller-SW-Web/Modulo-de-Seguridad-Backend/pull/57).

## Cambio

T4: Mi cuenta enlaza a `/mi-cuenta/seguridad`, protegida por la sesión existente.
Activa/desactiva por EMAIL mediante solicitud, reenvío y confirmación publicados en v2.
La desactivación requiere continuar el diálogo; cualquier rol de gestión muestra obligatorio.
Reutiliza tema, Mantine PinInput, API, sesión, errores y cliente HTTP compartidos.

El cliente selecciona v2 a partir de la misma base terminada en `/v1`; no se añade otro
cliente ni almacenamiento persistente. Solicitar permite la renovación reactiva normal.
Reenviar y confirmar renuevan antes si al access le quedan 60 s o menos (o exp ilegible),
usando la renovación compartida; no repiten por TOKEN_INVALIDO, que también puede
indicar un cambio inválido/consumido. El comportamiento
v1 existente se conserva. Token inválido limpia sesión y operación; tras red incierta en
confirmación exige releer el perfil antes de permitir otra mutación.

Token/código solo en memoria. Reenvío no amplía el plazo local del cambio; la cuenta regresiva
usa el menor vencimiento. Cancelar/expirar elimina el token local. No actualiza la bandera
antes de 204 más GET /auth/me ni crea sesión nueva. No usa rutas MFA históricas v1.

## Verificación inicial

Node 22.22.3 y npm 10.9.8; `npm ci` respetó package-lock.json.

```bash
npm run typecheck
npm run lint
npm test -- --maxWorkers=1
npm run build
```

Tipos y lint correctos; **68/68 pruebas**, 13 archivos. Once casos nuevos de UI y uno
del consumo v2, más regresión completa. API de UI simulada explícitamente; no sustituye
el recorrido con backend/correo reales. Build correcto. Vite advierte un chunk JS de
aproximadamente 537 kB; no se cambió la fragmentación, ajena a este incremento.

Incidencias corregidas: una prueba necesitaba esperar el montaje del diálogo animado;
se usaron las aserciones ya disponibles en el proyecto. La primera suite completa en
paralelo con el backend agotó 5 s en dos casos antiguos de contraseña; la repetición
con un solo worker pasó los 68 casos sin cambiar timeouts ni omitir pruebas.

## Pendiente

Publicar/revisar los PR enlazados y comprobar backend con V108 y permisos del runtime
antes de desplegar la SPA. Registrar SHAs/URL reales y recorrer EMAIL, activación,
desactivación, roles, reenvío, vencimientos, cuota y sesión revocada en el entorno.
No se acredita correo recibido ni integración desplegada por estos tests.
La integración G1 sigue separada en FEAT-11-T3 En curso; no se modificó Marketplace.

## Auditoría de Sergio (20-oct-2026)

Revisión sobre a40c7c28202d51398f52883c03920803eba133f5, publicada en el PR #11.
Solicitud con access vencido renueva y repite una vez; reenvío/confirmación renuevan
preventivamente y no se repiten después de un TOKEN_INVALIDO del cambio.
La renovación rechazada o un logout impiden enviar la mutación; un fallo de red al
renovar no borra la sesión. Tokens y códigos siguen solo en memoria.

Se bloquean X, Escape, clic exterior y Cancelar mientras hay petición en vuelo.
Cancelar limpia también el error. Una base v2 mal configurada conserva el error de
configuración, sin convertirse en RedError. El test de éxito identifica la confirmación 204.

Verificación de las correcciones: typecheck y lint correctos, **79/79 pruebas**
(13 archivos; 13 casos UI y 10 de API MFA), build de producción correcto.
Se conserva la advertencia de Vite por chunk JS de 537,59 kB. No acredita un recorrido desplegado.

Evidencia canónica H4 preparada en docs/evidencia/h4/FEAT-07.md del repositorio
Taller-SW-Web/Modulo-de-Seguridad, rama documental exclusiva feat/EP-04-mfa-v2.
Este archivo conserva el detalle técnico local; no sustituye la evidencia canónica.

Orden de fusión/despliegue: backend #57 revisado y CI aprobado, V108 aplicada y
permisos comprobados por Christian, y después frontend #11. Falta validar el recorrido
con correo real y registrar URLs/SHAs desplegados. No se cambió OpenAPI ni se aplicó SQL remoto.
