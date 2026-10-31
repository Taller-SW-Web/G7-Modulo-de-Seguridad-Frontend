// Ayudas de la suite E2E (FEAT-12-T3): cuentas fixture del backend con la
// contraseña solo por variable de entorno (nunca en el repositorio), pasos de
// inicio de sesión y lectura del OTP en el receptor de correo de pruebas.
//
// El receptor se habla por su API HTTP (compatible con Mailpit:
// GET /api/v1/messages y GET /api/v1/message/{id}); la URL es E2E_CORREO_API.
import { expect, type APIRequestContext, type Page } from '@playwright/test'

/** Cuentas fixture del backend (`g7.fixtures.cuentas.*`), dominio @fixtures.g7.test. */
export const CORREO_CLIENTE = process.env.E2E_CORREO_CLIENTE ?? 'cliente.a@fixtures.g7.test'
export const CORREO_ADMIN = process.env.E2E_CORREO_ADMIN ?? 'admin@fixtures.g7.test'

const API_CORREO = (process.env.E2E_CORREO_API ?? 'http://localhost:8025').replace(/\/+$/, '')

/** Contraseña común de las fixtures: nunca en el repo; la define quien levanta el stack. */
export function contrasenaDeFixtures(): string {
  const clave = process.env.E2E_CUENTAS_CLAVE
  if (!clave) {
    throw new Error(
      'Falta E2E_CUENTAS_CLAVE: la contraseña de las cuentas fixture viaja solo por variable de entorno. Ver e2e/README.md.',
    )
  }
  return clave
}

export async function rellenarInicioSesion(page: Page, correo: string, contrasena: string): Promise<void> {
  // Rol textbox + nombre accesible: el <label> de Mantine lleva «*» de requerido
  // (getByLabel exacto no emparejaría) y «Mostrar contraseña» es un botón, no textbox.
  await page.getByRole('textbox', { name: 'Correo', exact: true }).fill(correo)
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(contrasena)
}

export async function enviarInicioSesion(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
}

/**
 * Navega dentro de la SPA sin recargar: los tokens viven solo en memoria
 * (sin localStorage ni cookies), así que una recarga perdería la sesión.
 */
export async function navegarEnSpa(page: Page, ruta: string): Promise<void> {
  await page.evaluate((destino) => {
    window.history.pushState({}, '', destino)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, ruta)
}

export async function iniciarSesion(page: Page, correo: string, contrasena: string): Promise<void> {
  await page.goto('/login')
  await rellenarInicioSesion(page, correo, contrasena)
  await enviarInicioSesion(page)
}

/** Tras verificar el código, la SPA abre el destino por defecto de los permisos (FRONT-00 §1.4). */
export async function esperarDestinoTrasSesion(page: Page, destino: '/mi-cuenta' | '/admin/usuarios'): Promise<void> {
  await expect(page).toHaveURL(new RegExp(`${destino}$`))
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible()
}

interface ResumenCorreo {
  ID: string
  Recipients?: string[]
  To?: string | Array<string | { Address?: string; address?: string }>
}

function destinatarios(resumen: ResumenCorreo): string[] {
  const brutos = resumen.Recipients ?? resumen.To
  if (!brutos) return []
  const lista = Array.isArray(brutos) ? brutos : [brutos]
  return lista.map((d) => (typeof d === 'string' ? d : (d.Address ?? d.address ?? '')))
}

async function correosRecientes(solicitud: APIRequestContext): Promise<ResumenCorreo[]> {
  const respuesta = await solicitud.get(`${API_CORREO}/api/v1/messages`)
  if (!respuesta.ok()) {
    throw new Error(
      `El receptor de correo no responde en ${API_CORREO} (HTTP ${respuesta.status()}). Ver e2e/README.md.`,
    )
  }
  const datos = (await respuesta.json()) as { messages?: ResumenCorreo[] }
  return datos.messages ?? []
}

/** Marca de los correos ya presentes: el OTP nuevo debe llegar después de esta marca. */
export async function idsDeCorreos(solicitud: APIRequestContext): Promise<Set<string>> {
  const recientes = await correosRecientes(solicitud)
  return new Set(recientes.map((correo) => correo.ID))
}

/**
 * Espera el correo OTP del backend (asunto «Tu código de verificación»,
 * EntregaOtpSmtp) dirigido a `destinatario` y devuelve el código de 6 dígitos.
 */
export async function esperarCodigoOtp(
  solicitud: APIRequestContext,
  destinatario: string,
  anteriores: Set<string>,
): Promise<string> {
  const limite = Date.now() + 45_000
  let ultimo = 'sin intentos'
  while (Date.now() < limite) {
    const recientes = await correosRecientes(solicitud)
    const nuevo = recientes.find(
      (correo) =>
        !anteriores.has(correo.ID) &&
        destinatarios(correo).some((destino) => destino.toLowerCase() === destinatario.toLowerCase()),
    )
    if (nuevo) {
      const respuesta = await solicitud.get(`${API_CORREO}/api/v1/message/${nuevo.ID}`)
      const cuerpo = (await respuesta.json()) as { Text?: string; HTML?: string }
      const texto = cuerpo.Text ?? (cuerpo.HTML ?? '').replace(/<[^>]+>/g, ' ')
      const codigo = texto.match(/\b(\d{6})\b/)
      if (codigo) return codigo[1]
      ultimo = 'el correo nuevo no contiene un código de 6 dígitos'
    } else {
      ultimo = 'aún no hay un correo nuevo para esa dirección'
    }
    await new Promise((resolver) => setTimeout(resolver, 500))
  }
  throw new Error(`No llegó el OTP a ${destinatario} en ${API_CORREO}: ${ultimo}.`)
}
