# Guía para IA — frontend G7

Este es el repositorio de código `G7-Modulo-de-Seguridad-Frontend`. La fuente
SDD es el clon de `Taller-SW-Web/Modulo-de-Seguridad`; no inventar pantallas,
contratos ni mensajes si falta acceso. Abrir ambos clones y resolver las
fuentes desde su propia raíz.

Antes de editar: leer AGENTS.md y CONTEXT.md de documentación,
`plan/hito-3/ENTORNO-Y-REACT.md`, la spec de interfaz y la de componentes de
la pantalla, y el plan y tablero del dueño. Registrar la revisión documental
consumida y el ID de tarea. Implementar una tarea autorizada por vez.

- Vite 7, React 19.2, TypeScript 5.9 strict, Node 22 ≥ 22.12. React Router 7
  declarativo y Mantine 9.6.2 los añade la base compartida (EP-02-T001).
- Fetch nativo mediante el cliente HTTP compartido; Context/reducer para sesión.
  Sin Redux, Next.js ni un segundo cliente HTTP por dueño.
- Tokens solo en memoria: sin localStorage, sessionStorage ni cookies. Ningún
  secreto en el navegador ni con prefijo `VITE_`.
- La UI no decide autorización: ocultar un botón no sustituye al backend.
- Errores ProblemDetail del catálogo; ningún mensaje permite enumerar cuentas.
- No cambiar tokens visuales, tema ni sistema de diseño aprobado.

Verificar `npm run typecheck`, `lint`, `build` y las pruebas de la tarea.
No hacer commits/push ni implementar otra tarea salvo autorización del usuario.
