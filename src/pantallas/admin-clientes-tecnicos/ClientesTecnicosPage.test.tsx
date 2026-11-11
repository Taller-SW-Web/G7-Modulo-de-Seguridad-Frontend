import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { crearAlmacenSesion } from '../../shared/almacenSesion'
import { ApiError, RedError } from '../../shared/errores'
import type { ClienteTecnico, ScopeCatalogo } from '../../shared/tipos'
import { renderizar, sesionDe } from '../../test/renderizar'
import { TEXTOS } from './ClientesTecnicosPage'

const RUTA = '/admin/clientes-tecnicos'
const despacho: ClienteTecnico = {
  clientId: 'modulo-despacho', nombre: 'G2 Despacho y entrega', activo: true,
  scopes: [{ codigo: 'usuarios:leer', audiencia: 'api-seguridad' }],
}
const catalogo: ScopeCatalogo[] = [
  { codigo: 'usuarios:leer', audiencia: 'api-seguridad', descripcion: 'Datos básicos de usuario' },
  { codigo: 'roles:leer', audiencia: 'api-seguridad', descripcion: 'Catálogo de roles' },
]

function comoAdmin() {
  const almacen = crearAlmacenSesion()
  almacen.aceptar(sesionDe(['usuario.ver', 'integracion.gestionar'], ['ADMIN_SISTEMA']))
  return almacen
}

async function abrirAcciones(clientId: string, opcion: string) {
  const usuario = userEvent.setup()
  await usuario.click(await screen.findByRole('button', { name: `Acciones de ${clientId}` }))
  await usuario.click(await screen.findByRole('menuitem', { name: opcion }))
  return usuario
}

describe('FRONT-15 clientes técnicos', () => {
  it('lista los clientes con estado y scopes, y muestra la entrada del menú', async () => {
    const listarClientesTecnicos = vi.fn().mockResolvedValue([despacho, { ...despacho, clientId: 'modulo-retail', activo: false, scopes: [] }])
    renderizar({ listarClientesTecnicos }, RUTA, comoAdmin())

    const tarjeta = await screen.findByRole('article', { name: 'modulo-despacho' })
    expect(within(tarjeta).getByText('Activo')).toBeTruthy()
    expect(within(tarjeta).getByText('usuarios:leer')).toBeTruthy()
    expect(within(screen.getByRole('article', { name: 'modulo-retail' })).getByText('Inactivo')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Configuración' })).toBeTruthy()
  })

  it('UI-15.5: sin integracion.gestionar no monta la pantalla ni llama al endpoint', async () => {
    const almacen = crearAlmacenSesion()
    almacen.aceptar(sesionDe(['usuario.ver'], ['ADMIN_SISTEMA']))
    const listarClientesTecnicos = vi.fn()
    renderizar({ listarClientesTecnicos, listarUsuarios: vi.fn().mockResolvedValue({ usuarios: [], pagina: 1, tamano: 20, total: 0 }) }, RUTA, almacen)

    expect(await screen.findByText('No tienes permiso para realizar esta acción.')).toBeTruthy()
    expect(listarClientesTecnicos).not.toHaveBeenCalled()
    expect(screen.queryByRole('link', { name: 'Configuración' })).toBeNull()
  })

  it('vacío y error con reintento', async () => {
    const listarClientesTecnicos = vi.fn()
      .mockRejectedValueOnce(new ApiError(503, { code: 'NO_DISPONIBLE' }, null))
      .mockResolvedValueOnce([])
    renderizar({ listarClientesTecnicos }, RUTA, comoAdmin())

    expect(await screen.findByText(TEXTOS.errorCarga)).toBeTruthy()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText(TEXTOS.vacio)).toBeTruthy()
  })

  it('UI-15.1 y UI-15.2: el alta muestra el secreto una vez y solo se cierra tras confirmarlo', async () => {
    const listarClientesTecnicos = vi.fn().mockResolvedValue([])
    const crearClienteTecnico = vi.fn().mockResolvedValue({ ...despacho, clientId: 'modulo-prueba-h5', clientSecret: 'secreto-de-prueba-43' })
    const catalogoScopes = vi.fn().mockResolvedValue(catalogo)
    renderizar({ listarClientesTecnicos, crearClienteTecnico, catalogoScopes }, RUTA, comoAdmin())
    const usuario = userEvent.setup()

    await usuario.click(await screen.findByRole('button', { name: 'Nuevo cliente' }))
    await usuario.type(await screen.findByLabelText(/Identificador/), 'modulo-prueba-h5')
    await usuario.type(screen.getByLabelText(/Nombre/), 'Cliente de prueba H5')
    await usuario.click(screen.getByRole('button', { name: 'Crear cliente' }))

    expect(crearClienteTecnico).toHaveBeenCalledWith('modulo-prueba-h5', 'Cliente de prueba H5', [])
    const dialogo = await screen.findByRole('alertdialog', { name: 'Secreto de modulo-prueba-h5' })
    expect(within(dialogo).getByTestId('secreto').textContent).toBe('secreto-de-prueba-43')
    expect(within(dialogo).getByText(TEXTOS.avisoSecreto)).toBeTruthy()
    const cerrar = within(dialogo).getByRole('button', { name: 'Cerrar' })
    expect((cerrar as HTMLButtonElement).disabled).toBe(true)

    await usuario.click(within(dialogo).getByLabelText('Ya guardé el secreto'))
    await usuario.click(cerrar)
    await waitFor(() => expect(screen.queryByText('secreto-de-prueba-43')).toBeNull())
    expect(window.location.href).not.toContain('secreto')
    expect(JSON.stringify({ ...localStorage })).not.toContain('secreto-de-prueba-43')
    expect(JSON.stringify({ ...sessionStorage })).not.toContain('secreto-de-prueba-43')
    expect(listarClientesTecnicos).toHaveBeenCalledTimes(2)
  })

  it('valida el identificador y el nombre antes de llamar al backend', async () => {
    const crearClienteTecnico = vi.fn()
    renderizar({ listarClientesTecnicos: vi.fn().mockResolvedValue([]), crearClienteTecnico, catalogoScopes: vi.fn().mockResolvedValue([]) }, RUTA, comoAdmin())
    const usuario = userEvent.setup()

    await usuario.click(await screen.findByRole('button', { name: 'Nuevo cliente' }))
    await usuario.type(await screen.findByLabelText(/Identificador/), 'Modulo X')
    await usuario.click(screen.getByRole('button', { name: 'Crear cliente' }))

    expect(await screen.findByText(TEXTOS.clientId)).toBeTruthy()
    expect(screen.getByText(TEXTOS.nombre)).toBeTruthy()
    expect(crearClienteTecnico).not.toHaveBeenCalled()
  })

  it('UI-15.4: un identificador repetido deja el formulario abierto sin mostrar secreto', async () => {
    const crearClienteTecnico = vi.fn().mockRejectedValue(new ApiError(409, { code: 'CLIENTE_SERVICIO_EXISTENTE' }, null))
    renderizar({ listarClientesTecnicos: vi.fn().mockResolvedValue([despacho]), crearClienteTecnico, catalogoScopes: vi.fn().mockResolvedValue([]) }, RUTA, comoAdmin())
    const usuario = userEvent.setup()

    await usuario.click(await screen.findByRole('button', { name: 'Nuevo cliente' }))
    await usuario.type(await screen.findByLabelText(/Identificador/), 'modulo-despacho')
    await usuario.type(screen.getByLabelText(/Nombre/), 'Otro')
    await usuario.click(screen.getByRole('button', { name: 'Crear cliente' }))

    expect(await screen.findByText(TEXTOS.existente)).toBeTruthy()
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('UI-15.6: rotar pide confirmación, envía una sola petición y muestra el secreto nuevo', async () => {
    let resolver: (v: unknown) => void = () => {}
    const rotarSecretoClienteTecnico = vi.fn().mockReturnValue(new Promise((r) => { resolver = r }))
    renderizar({ listarClientesTecnicos: vi.fn().mockResolvedValue([despacho]), rotarSecretoClienteTecnico }, RUTA, comoAdmin())

    const usuario = await abrirAcciones('modulo-despacho', 'Rotar secreto')
    expect(await screen.findByText(TEXTOS.confirmarRotar)).toBeTruthy()
    const confirmar = screen.getByRole('button', { name: 'Confirmar' })
    await usuario.click(confirmar)
    await usuario.click(confirmar)
    expect(rotarSecretoClienteTecnico).toHaveBeenCalledTimes(1)

    resolver({ ...despacho, clientSecret: 'rotado-nuevo' })
    expect(await screen.findByRole('alertdialog', { name: 'Secreto de modulo-despacho' })).toBeTruthy()
    expect(screen.getByTestId('secreto').textContent).toBe('rotado-nuevo')
  })

  it('una rotación sin respuesta avisa que el resultado es incierto y recarga', async () => {
    const listarClientesTecnicos = vi.fn().mockResolvedValue([despacho])
    const rotarSecretoClienteTecnico = vi.fn().mockRejectedValue(new RedError())
    renderizar({ listarClientesTecnicos, rotarSecretoClienteTecnico }, RUTA, comoAdmin())

    const usuario = await abrirAcciones('modulo-despacho', 'Rotar secreto')
    await usuario.click(await screen.findByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText(TEXTOS.rotacionIncierta)).toBeTruthy()
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await waitFor(() => expect(listarClientesTecnicos).toHaveBeenCalledTimes(2))
  })

  it('desactivar confirma y recarga la lista', async () => {
    const listarClientesTecnicos = vi.fn().mockResolvedValueOnce([despacho]).mockResolvedValueOnce([{ ...despacho, activo: false }])
    const cambiarEstadoClienteTecnico = vi.fn().mockResolvedValue(undefined)
    renderizar({ listarClientesTecnicos, cambiarEstadoClienteTecnico }, RUTA, comoAdmin())

    const usuario = await abrirAcciones('modulo-despacho', 'Desactivar')
    expect(await screen.findByText(TEXTOS.confirmarDesactivar)).toBeTruthy()
    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(cambiarEstadoClienteTecnico).toHaveBeenCalledWith('modulo-despacho', false)
    expect(await screen.findByText('Inactivo')).toBeTruthy()
    expect(screen.getByText('Cliente modulo-despacho desactivado.')).toBeTruthy()
  })

  it('UI-15.3: conceder y revocar desde el panel de scopes', async () => {
    const conScopes = { ...despacho, scopes: [...despacho.scopes, { codigo: 'roles:leer', audiencia: 'api-seguridad' }] }
    const listarClientesTecnicos = vi.fn().mockResolvedValueOnce([despacho]).mockResolvedValueOnce([conScopes]).mockResolvedValue([despacho])
    const concederScope = vi.fn().mockResolvedValue(undefined)
    const revocarScope = vi.fn().mockResolvedValue(undefined)
    renderizar({ listarClientesTecnicos, concederScope, revocarScope, catalogoScopes: vi.fn().mockResolvedValue(catalogo) }, RUTA, comoAdmin())

    const usuario = await abrirAcciones('modulo-despacho', 'Gestionar scopes')
    await usuario.click((await screen.findAllByLabelText('Conceder un scope')).find((e) => e.tagName === 'INPUT')!)
    await usuario.click(await screen.findByRole('option', { name: /roles:leer/, hidden: true }))
    await usuario.click(screen.getByRole('button', { name: 'Conceder' }))
    expect(concederScope).toHaveBeenCalledWith('modulo-despacho', 'roles:leer')

    const revocar = await screen.findAllByRole('button', { name: 'Revocar' })
    await usuario.click(revocar[revocar.length - 1])
    expect(await screen.findByText(TEXTOS.confirmarRevocar)).toBeTruthy()
    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(revocarScope).toHaveBeenCalledWith('modulo-despacho', 'roles:leer')
  })

  it('un cliente que ya no existe avisa con el texto de la spec', async () => {
    const cambiarEstadoClienteTecnico = vi.fn().mockRejectedValue(new ApiError(404, { code: 'NO_ENCONTRADO' }, null))
    renderizar({ listarClientesTecnicos: vi.fn().mockResolvedValue([despacho]), cambiarEstadoClienteTecnico }, RUTA, comoAdmin())

    const usuario = await abrirAcciones('modulo-despacho', 'Desactivar')
    await usuario.click(await screen.findByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText(TEXTOS.noExiste)).toBeTruthy()
  })
})
