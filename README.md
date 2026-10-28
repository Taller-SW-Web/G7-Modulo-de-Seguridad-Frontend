# Frontend del proveedor de identidad — G7

Repositorio de código independiente de `Modulo-de-Seguridad`, que conserva las
fuentes SDD (specs, contrato, planes y tareas). Base: Vite **7**, React **19.2**,
TypeScript **5.9** strict, Node **22 LTS ≥ 22.12**. El backend vive en
[Modulo-de-Seguridad-Backend](https://github.com/Taller-SW-Web/Modulo-de-Seguridad-Backend).

## Antes de implementar

Abrir también el clon de [documentación G7](https://github.com/Taller-SW-Web/Modulo-de-Seguridad).
Leer allí `AGENTS.md`, `plan/hito-3/ENTORNO-Y-REACT.md`, las specs de interfaz
(`specs/front/`) y de componentes (`specs/componentes-react/`), y el PLAN.md y
TAREAS.md propios. Registrar el SHA de documentación consumido junto al SHA del
código. Las rutas `src/...` de los tableros son relativas a este repositorio.

Estructura acordada: `src/pantallas/<pantalla>/` por dueño y `src/shared/` para
api, errores, sesión y tema. Jose Luis prepara la base compartida (EP-02-T001):
router, sesión en memoria, cliente HTTP, Mantine y Vitest. Cada integrante
implementa sus pantallas y bloques; no se desarrollan componentes ajenos.

## Comandos

```bash
npm ci
npm run dev        # servidor de desarrollo
npm run typecheck  # tsc -b
npm run lint
npm run build      # typecheck + bundle en dist/
npm test           # Vitest + Testing Library (jsdom)
npm run preview
```

Las versiones están fijadas sin rangos y con `package-lock.json`: instalar con
`npm ci`, no con `latest`. Una dependencia nueva se añade con versión exacta.

## Configuración

Para la demo local o un túnel, compilar con `VITE_API_BASE_URL=/api/v1` (en Git Bash anteponer
`MSYS_NO_PATHCONV=1`) y servir con `npx vite preview`: el proxy reenvía `/api` a
`G7_BACKEND_URL` (por defecto `http://localhost:8080`) y `G7_HOSTS_PERMITIDOS` admite el host
público del túnel. Así front y API comparten origen y no hace falta CORS.

Variables públicas de build (llegan al navegador):

| Variable | Uso |
|---|---|
| `VITE_API_BASE_URL` | URL base del backend G7, con `/api/v1` |
| `VITE_RETORNO_MARKETPLACE` | Login de Marketplace (G1) al que vuelven las cuentas de `MARKETPLACE` y `RETAIL` tras verificar el correo (FRONT-03, FEAT-01-T4). Vacía → nuestro login |

La de retorno solo se usa si es una URL absoluta `https` (o `http://localhost`) sin
parámetros; el enlace del correo trae el canal, nunca la URL. Nada secreto lleva
prefijo `VITE_`: ni `client_secret`, ni claves de Supabase, ni tokens. Los
`.env` locales no se suben (ver `.gitignore`).

## Base compartida (EP-02-T001/T008)

| Pieza | Archivo | Uso |
|---|---|---|
| Tema Mantine 9.6.2 del sistema de diseño | `src/shared/tema.ts` | `MantineProvider` en `main.tsx` |
| Tipos del contrato | `src/shared/tipos.ts` | `Usuario`, `SesionIniciada`, `Problem`… |
| Cliente HTTP único | `src/shared/http.ts`, `src/shared/api.ts` | `api.<operación>()`; Bearer, ProblemDetail, `Retry-After`, una renovación en vuelo y una sola repetición ante `TOKEN_INVALIDO` |
| Errores transversales | `src/shared/errores.ts` | `mensajeDeError`, `erroresPorCampo` (FRONT-00 §2) |
| Sesión en memoria | `src/shared/almacenSesion.ts`, `src/shared/sesion.tsx` | `useSesion()`: `estado`, `tienePermiso`, `aceptarSesion`, `cerrarSesion` |
| Guards y destino | `src/shared/rutas.tsx`, `src/shared/navegacion.ts` | `RutaPublica`, `RutaAutenticada`, `RutaAdmin`, `volverSeguro` |
| Marco con navegación | `src/shared/Marco.tsx` | encabezado y cierre de sesión |

Cada dueño añade su pantalla en `src/pantallas/<pantalla>/` y su ruta en `src/App.tsx`.
`/mi-cuenta` muestra por ahora los datos de la sesión; FRONT-06 (Valery) lo reemplaza.
