# FEAT-03 — retorno por canal en recuperación (issue #76)

**Fecha:** 2-nov-2026  
**Rama local:** `feat/EP-03-retorno-por-canal`  
**Base frontend:** `71fd40f4675647ad420255213997bde06deb2c04` (`develop`)  
**Fuentes SDD:** `Modulo-de-Seguridad` `origin/main` en `6045c013fd454cff998169bd1b114323324cda72`; issue [#76](https://github.com/Taller-SW-Web/Modulo-de-Seguridad/issues/76).

## Alcance aplicado

- 5a retiene el canal leído del enlace y envía `canalOrigen` con la solicitud si no es `WEB`; para `WEB` omite el campo y se conserva el valor predeterminado del contrato.
- 5b lee token y canal antes de retirarlos de la barra de direcciones.
- Tras un `204`, limpia la sesión local y muestra «Iniciar sesión». MARKETPLACE y RETAIL usan la misma URL `VITE_RETORNO_MARKETPLACE` configurada para G1, conforme a FRONT-03; WEB, CHATBOT, canal desconocido o URL no válida vuelven al login local.
- Se reutiliza la lista de retorno existente; no se acepta ni navega a una URL recibida en el enlace. README documenta la variable de build existente, sin agregar una nueva configuración para RETAIL.

Fuentes consultadas: issue #76; FRONT-05, «Retorno por canal» y escenarios UI-05.8/UI-05.9; SPEC-08 RF-08.9; OpenAPI de `POST /password/recuperar`, publicados en el SHA indicado. No se modificó el contrato.

## Verificación local

Entorno: Node 22.16.0, npm 10.9.2.

- `npm run typecheck`: correcto.
- `npm run lint`: correcto.
- `npm run build`: correcto; Vite muestra el aviso existente de chunk JavaScript mayor de 500 kB.
- `RecuperacionPage.test.tsx`: 14/14; `retornoCanal.test.ts`: 4/4; `apiRecuperacion.test.ts`: 2/2, aprobados en la suite.
- Las otras 153 pruebas pasaron con `npx vitest run --exclude src/pantallas/registro/RegistroPage.test.tsx`.
- `RegistroPage.test.tsx`: 11/11 pasan al ejecutarlo aisladamente. En la suite conjunta hubo fallos intermitentes de timeout/estado en ese archivo; no se modificó porque corresponde a FEAT-01.

No se hizo commit, push, despliegue ni prueba contra el backend desplegado. La prueba UI usa dobles; la integración real queda pendiente de que el cambio backend del #76 se integre y esté disponible. El frontend reutiliza la variable de build existente `VITE_RETORNO_MARKETPLACE`; la configuración efectiva de Render no se modificó ni verificó en este trabajo. No se añadió una URL de despliegue al código.
