# CI y protección del frontend

Mismo esquema que el backend. Cada tarea sale de `develop` hacia una rama
`feature/<ID-de-tarea>` y abre PR hacia `develop`. Las versiones verificadas
llegan a `main` solo mediante PR de `develop` de este mismo repositorio: el
check de destino impide aprobar con CI un PR de tarea dirigido a `main`.

## Qué comprueba

| Check | Qué hace |
|---|---|
| `Frontend - destino del PR` | Rechaza un PR a `main` que no venga de `develop` |
| `Frontend - build y pruebas` | Node de `.nvmrc` (22), `npm ci` con el lockfile, `lint`, `typecheck`, `test` (cuando exista) y `build` |

No usa secretos. `npm test` (Vitest) es obligatorio desde la base compartida
(EP-02-T001). No se excluyen pruebas ni reglas de lint
para que el CI quede verde.

## Protección de ramas (activa)

`main` y `develop` tienen las mismas reglas que el backend:

- PR obligatorio. Desde el 15-oct-2026 no se exigen aprobaciones (un solo
  desarrollador activo); el CI en verde es la condición de merge.
- Checks obligatorios: los dos de la tabla, con la rama al día con su base.
- Conversaciones resueltas antes del merge.
- Se aplica también a administradores.
- Sin force push ni borrado de `main`/`develop`.

Las ramas de tarea se pueden borrar después del merge. Los conflictos los
resuelve el autor y el CI vuelve a ejecutarse con la rama actualizada.

## Comprobar localmente

```bash
npm ci
npm run lint && npm run typecheck && npm run build
```

## Política de seguridad del pipeline (FEAT-15-T4)

En los PR a `develop`, los checks de destino y build/pruebas son los gates
obligatorios del frontend. Gitleaks bloquea si detecta un secreto en el historial
del PR. Para que GitHub impida el merge, un administrador debe marcar
`Secretos / historial del PR` como check requerido en la protección de
`develop`; el archivo no cambia por sí solo esa configuración. CodeQL y
Dependency Review publican resultados para revisión, pero no bloquean
automáticamente en esta configuración. Los hallazgos se revisan y se
documenta su decisión antes de integrar cambios relevantes; un check verde solo
indica que el análisis terminó sin error, no que su reporte esté vacío.

La evidencia consolidada de las ejecuciones y decisiones está en el repositorio
de especificaciones, `docs/evidencia/h5/FEAT-15.md`.
