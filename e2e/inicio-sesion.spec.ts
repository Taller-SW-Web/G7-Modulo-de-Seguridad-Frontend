// FEAT-12-T3 — casos de inicio de sesión (FRONT-01) y de ruta privada sin
// sesión (FRONT-00 §1.4). Cuentas fixture del backend; la contraseña llega
// por E2E_CUENTAS_CLAVE, nunca por el repositorio.
import { expect, test } from '@playwright/test'
import {
  CORREO_ADMIN,
  CORREO_CLIENTE,
  contrasenaDeFixtures,
  enviarInicioSesion,
  esperarCodigoOtp,
  esperarDestinoTrasSesion,
  idsDeCorreos,
  iniciarSesion,
  rellenarInicioSesion,
} from './ayudas'

test('login cliente abre Mi cuenta', async ({ page }) => {
  await iniciarSesion(page, CORREO_CLIENTE, contrasenaDeFixtures())
  await esperarDestinoTrasSesion(page, '/mi-cuenta')
  await expect(page.getByRole('heading', { name: 'Mi cuenta' })).toBeVisible()
})

test('login admin completa el segundo factor con el código del receptor de correo', async ({ page, request }) => {
  test.setTimeout(120_000)
  const anteriores = await idsDeCorreos(request)
  await iniciarSesion(page, CORREO_ADMIN, contrasenaDeFixtures())

  // FRONT-04: sin tokens todavía, solo el desafío; la pantalla pide el código.
  await expect(page).toHaveURL(/\/otp/)
  await expect(page.getByRole('heading', { name: 'Verifica que eres tú' })).toBeVisible()
  await expect(page.getByText(/Escribe el código que enviamos a/)).toBeVisible()

  const codigo = await esperarCodigoOtp(request, CORREO_ADMIN, anteriores)
  await page.getByLabel('Dígito 1 de 6').pressSequentially(codigo, { delay: 40 })

  // ADMIN_SISTEMA tiene usuario.ver: el destino por defecto es el panel.
  await esperarDestinoTrasSesion(page, '/admin/usuarios')
  await expect(page.getByRole('heading', { name: 'Usuarios' })).toBeVisible()
})

test('ruta privada sin sesión lleva al login y recuerda el destino', async ({ page }) => {
  await page.goto('/mi-cuenta')
  await expect(page).toHaveURL(/\/login\?volver=%2Fmi-cuenta/)

  await rellenarInicioSesion(page, CORREO_CLIENTE, contrasenaDeFixtures())
  await enviarInicioSesion(page)
  await esperarDestinoTrasSesion(page, '/mi-cuenta')
  await expect(page.getByRole('heading', { name: 'Mi cuenta' })).toBeVisible()
})
