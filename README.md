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
npm run preview
```

Las versiones están fijadas sin rangos y con `package-lock.json`: instalar con
`npm ci`, no con `latest`. Una dependencia nueva se añade con versión exacta.

## Configuración

`VITE_API_BASE_URL` es la única variable pública prevista. Nada secreto lleva
prefijo `VITE_`: ni `client_secret`, ni claves de Supabase, ni tokens. Los
`.env` locales no se suben (ver `.gitignore`).

Estado: scaffold de Vite. La base compartida y las pantallas H3 siguen
pendientes en los tableros de cada dueño.
