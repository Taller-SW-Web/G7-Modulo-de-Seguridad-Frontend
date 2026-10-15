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

No usa secretos. `npm test --if-present` se activa solo cuando la base
compartida (EP-02-T001, Jose Luis) añada Vitest y el script `test`; desde ese
momento las pruebas son obligatorias. No se excluyen pruebas ni reglas de lint
para que el CI quede verde.

## Protección de ramas (activa)

`main` y `develop` tienen las mismas reglas que el backend:

- PR obligatorio con **una aprobación**; nadie aprueba su propio PR.
- Una aprobación se invalida si llegan commits nuevos, y debe cubrir el último push.
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
