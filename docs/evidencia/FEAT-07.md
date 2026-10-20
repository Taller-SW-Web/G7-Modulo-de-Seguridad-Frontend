# FEAT-07 Pantalla del segundo factor

Corte: 20-oct-2026, America/Lima. Luis David Morales Brenis.
Estado: preparada localmente para revisión; **no verificada en despliegue**.

Fuente documental: main `029171b61335ec0412af777c2d8a0559d8dadb16` (#64),
SPEC-10, FRONT-09 e interfaz React, OpenAPI v2 2.0.0 y convenciones compartidas.
Base frontend: develop `82c94149c8e2326d3d6013a167026a6b38d75b4a`.
Rama: `feat/EP-04-mfa-v2`; PR hacia develop, enlazado después al PR backend de la misma FEAT.

## Cambio

T4: Mi cuenta enlaza a `/mi-cuenta/seguridad`, protegida por la sesión existente.
Activa/desactiva por EMAIL mediante solicitud, reenvío y confirmación publicados en v2.
La desactivación requiere continuar el diálogo; cualquier rol de gestión muestra obligatorio.
Reutiliza tema, Mantine PinInput, API, sesión, errores y cliente HTTP compartidos.

El cliente selecciona v2 a partir de la misma base terminada en `/v1`; no se añade otro
cliente ni almacenamiento persistente. Las mutaciones MFA desactivan la repetición automática
por TOKEN_INVALIDO, que también puede indicar un cambio inválido/consumido. El comportamiento
v1 existente se conserva. Token inválido limpia sesión y operación; tras red incierta en
confirmación exige releer el perfil antes de permitir otra mutación.

Token/código solo en memoria. Reenvío no amplía el plazo local del cambio; la cuenta regresiva
usa el menor vencimiento. Cancelar/expirar elimina el token local. No actualiza la bandera
antes de 204 más GET /auth/me ni crea sesión nueva. No usa rutas MFA históricas v1.

## Verificación

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

Sin stage, commit, push, PR ni configuración remota desde esta sesión. OpenAPI permanece sin cambios.
