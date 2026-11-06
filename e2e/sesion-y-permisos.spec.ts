// FEAT-12-T3 — sesión (FRONT-00 §1.2 renovación, §1.3 cierre) y guards por
// permiso (§1.4). El reloj de Playwright adelanta el navegador más allá de los
// 900 s del access token para ejercitar la renovación sin esperarla en real.
import { expect, test, type Response } from '@playwright/test'
import { CORREO_CLIENTE, contrasenaDeFixtures, esperarDestinoTrasSesion, iniciarSesion, navegarEnSpa } from './ayudas'

function autorizacion(respuesta: Response): string {
  const cabeceras = respuesta.request().headers()
  return cabeceras['authorization'] ?? cabeceras['Authorization'] ?? ''
}

test('refresh silencioso: la mutación renueva la sesión sin salir de la pantalla', async ({ page }) => {
  await page.clock.install({ time: new Date() })
  await iniciarSesion(page, CORREO_CLIENTE, contrasenaDeFixtures())
  await esperarDestinoTrasSesion(page, '/mi-cuenta')

  // Enlace interno de Mi cuenta (Button sobre Link → rol «link»): la sesión
  // vive solo en memoria, no puede recargarse.
  await page.getByRole('link', { name: 'Segundo factor' }).click()
  await expect(page.getByRole('heading', { name: 'Segundo factor' })).toBeVisible()
  await expect(page.getByText('Segundo factor desactivado.')).toBeVisible()

  // Access token de 900 s: adelantar el reloj del navegador lo deja vencido
  // allí; el servidor sigue con su hora real y el refresh token sigue vigente.
  await page.clock.fastForward(15 * 60 * 1000)

  // Primer paso del cambio de segundo factor (solicitar) con el token original.
  const solicitud = page.waitForResponse(
    (respuesta) => respuesta.request().method() === 'POST' && respuesta.url().endsWith('/auth/mfa/cambios'),
  )
  await page.getByRole('button', { name: 'Activar' }).click()
  const respuestaSolicitud = await solicitud
  expect(respuestaSolicitud.ok()).toBeTruthy()
  await expect(page.getByRole('heading', { name: 'Confirma el cambio' })).toBeVisible()

  // El reenvío lleva `renovarAntesDeEnviar`: la SPA renueva primero y en silencio.
  const refresco = page.waitForResponse(
    (respuesta) => respuesta.request().method() === 'POST' && respuesta.url().endsWith('/auth/refresh'),
  )
  const reenvio = page.waitForResponse(
    (respuesta) =>
      respuesta.request().method() === 'POST' && respuesta.url().endsWith('/auth/mfa/cambios/reenviar'),
  )
  await page.getByRole('button', { name: 'Reenviar código' }).click()

  const respuestaRefresco = await refresco
  expect(respuestaRefresco.status()).toBe(200)
  const respuestaReenvio = await reenvio
  expect(respuestaReenvio.ok()).toBeTruthy()
  // El reenvío salió con un token distinto: la renovación fue efectiva.
  expect(autorizacion(respuestaReenvio)).not.toBe(autorizacion(respuestaSolicitud))

  // Sin salto al login: la sesión sigue activa en la misma pantalla.
  await expect(page).toHaveURL(/\/mi-cuenta\/seguridad/)
  await expect(page.getByRole('heading', { name: 'Confirma el cambio' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible()

  // Se cancela sin confirmar: el estado de la cuenta fixture no cambia.
  await page.getByRole('button', { name: 'Cancelar' }).click()
  await expect(page.getByRole('heading', { name: 'Confirma el cambio' })).toBeHidden()
})

test('logout cierra la sesión y la ruta autenticada vuelve a pedir login', async ({ page }) => {
  await iniciarSesion(page, CORREO_CLIENTE, contrasenaDeFixtures())
  await esperarDestinoTrasSesion(page, '/mi-cuenta')

  const cierre = page.waitForResponse(
    (respuesta) => respuesta.request().method() === 'POST' && respuesta.url().endsWith('/auth/logout'),
  )
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  const respuestaCierre = await cierre
  expect(respuestaCierre.ok()).toBeTruthy()

  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByText('Cerraste sesión.')).toBeVisible()

  // La sesión local murió: volver a la ruta autenticada redirige al login.
  await page.goto('/mi-cuenta')
  await expect(page).toHaveURL(/\/login\?volver=%2Fmi-cuenta/)
})

test('ruta de administración con sesión de CLIENTE queda bloqueada sin pedir datos', async ({ page }) => {
  await iniciarSesion(page, CORREO_CLIENTE, contrasenaDeFixtures())
  await esperarDestinoTrasSesion(page, '/mi-cuenta')

  const consultasDeUsuarios: string[] = []
  page.on('request', (solicitud) => {
    if (solicitud.url().includes('/api/v1/usuarios')) consultasDeUsuarios.push(solicitud.url())
  })

  await navegarEnSpa(page, '/admin/usuarios')
  await expect(page).toHaveURL(/\/admin\/usuarios/)
  await expect(page.getByText('Acceso restringido')).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('No tienes permiso para realizar esta acción.')

  // El guard decide antes de montar la pantalla: sin llamada a GET /usuarios.
  await page.waitForTimeout(500)
  expect(consultasDeUsuarios).toEqual([])
})
