// FRONT-15 — Configuración: clientes técnicos (SPEC-19, FEAT-14). El secreto solo
// vive en el estado del diálogo que lo muestra; nunca en la URL ni en el navegador.
import {
  Alert, Badge, Button, Checkbox, Code, Container, CopyButton, Group, Menu, Modal, MultiSelect, Paper,
  Select, Skeleton, Stack, Text, TextInput, Title,
} from '@mantine/core'
import { IconDots } from '@tabler/icons-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Api } from '../../shared/api'
import { ApiError, erroresPorCampo, mensajeDeError, RedError } from '../../shared/errores'
import type { ClienteTecnico, ScopeCatalogo } from '../../shared/tipos'

const CLIENT_ID = /^[a-z0-9][a-z0-9-]{2,49}$/
export const TEXTOS = {
  vacio: 'Todavía no hay clientes técnicos.',
  errorCarga: 'No pudimos cargar los clientes técnicos.',
  sinPermiso: 'No tienes permiso para gestionar clientes técnicos.',
  existente: 'Ya existe un cliente con ese identificador.',
  noExiste: 'Ese cliente ya no existe. Recargamos la lista.',
  fallo: 'No pudimos completar el cambio. Inténtalo de nuevo.',
  rotacionIncierta: 'No sabemos si el secreto cambió. Si el cambio se aplicó, rota el secreto otra vez para obtener uno que puedas ver.',
  avisoSecreto: 'Este secreto solo se muestra ahora. Entrégalo al equipo dueño por un canal privado.',
  clientId: 'Usa de 3 a 50 caracteres: minúsculas, números y guiones; empieza con letra o número.',
  nombre: 'Escribe un nombre de hasta 100 caracteres.',
  confirmarRotar: 'El secreto actual dejará de funcionar ahora. El módulo no podrá pedir tokens hasta que configure el nuevo.',
  confirmarDesactivar: 'El módulo no podrá pedir tokens nuevos. Los que ya tiene siguen valiendo hasta una hora.',
  confirmarReactivar: 'El módulo podrá volver a pedir tokens con sus scopes actuales.',
  confirmarRevocar: 'El próximo token del módulo ya no incluirá este scope.',
} as const

type Carga = { tipo: 'cargando' } | { tipo: 'error'; error: unknown } | { tipo: 'listo'; clientes: ClienteTecnico[] }
type Confirmacion = { tipo: 'rotar' | 'desactivar' | 'reactivar'; cliente: ClienteTecnico } | { tipo: 'revocar'; cliente: ClienteTecnico; scope: string }

function mensajeCambio(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'CLIENTE_SERVICIO_EXISTENTE') return TEXTOS.existente
    if (error.code === 'NO_ENCONTRADO') return TEXTOS.noExiste
    if (error.status === 403) return TEXTOS.sinPermiso
    if (error.code === 'VALIDACION') return erroresPorCampo(error).scope ?? 'Revisa los datos del formulario.'
  }
  if (error instanceof RedError || (error instanceof ApiError && error.status === 503)) return TEXTOS.fallo
  return mensajeDeError(error)
}

export function ClientesTecnicosPage({ api }: { api: Api }) {
  const [carga, setCarga] = useState<Carga>({ tipo: 'cargando' })
  const [catalogo, setCatalogo] = useState<ScopeCatalogo[] | null>(null)
  const [aviso, setAviso] = useState('')
  const [alta, setAlta] = useState(false)
  const [gestion, setGestion] = useState<ClienteTecnico | null>(null)
  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null)
  const [secreto, setSecreto] = useState<{ clientId: string; valor: string } | null>(null)

  const cargar = useCallback(async (signal?: AbortSignal) => {
    setCarga({ tipo: 'cargando' })
    try {
      const clientes = await api.listarClientesTecnicos(signal)
      setCarga({ tipo: 'listo', clientes })
    } catch (e) {
      if (!signal?.aborted) setCarga({ tipo: 'error', error: e })
    }
  }, [api])

  useEffect(() => {
    const control = new AbortController()
    void cargar(control.signal)
    return () => control.abort()
  }, [cargar])

  const pedirCatalogo = useCallback(async () => {
    if (catalogo) return
    try { setCatalogo(await api.catalogoScopes()) } catch { setCatalogo([]) }
  }, [api, catalogo])

  function tras(texto: string) { setAviso(texto); void cargar() }

  const clienteEnGestion = gestion && carga.tipo === 'listo'
    ? carga.clientes.find((c) => c.clientId === gestion.clientId) ?? gestion : gestion

  return (
    <Container size="xl" py="md">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={1} size="h2">Clientes técnicos</Title>
          <Button onClick={() => { setAviso(''); setAlta(true); void pedirCatalogo() }}>Nuevo cliente</Button>
        </Group>
        <Text size="sm" c="dimmed">Módulos que piden tokens de servicio a Seguridad, con los scopes que tienen concedidos.</Text>
        {aviso && <Alert role="status" withCloseButton onClose={() => setAviso('')}>{aviso}</Alert>}

        {carga.tipo === 'cargando' && (
          <Stack gap="xs" aria-busy="true" aria-label="Cargando clientes técnicos">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} h={72} />)}
          </Stack>
        )}
        {carga.tipo === 'error' && (
          <Alert color="red" role="alert" title={TEXTOS.errorCarga}>
            {carga.error instanceof ApiError && carga.error.status === 403
              ? TEXTOS.sinPermiso
              : <Button size="xs" variant="light" onClick={() => void cargar()}>Reintentar</Button>}
          </Alert>
        )}
        {carga.tipo === 'listo' && carga.clientes.length === 0 && (
          <Paper withBorder p="lg" radius="md"><Text ta="center">{TEXTOS.vacio}</Text></Paper>
        )}
        {carga.tipo === 'listo' && carga.clientes.map((cliente) => (
          <Paper key={cliente.clientId} withBorder p="md" radius="md" component="article" aria-label={cliente.clientId}>
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Stack gap={4} miw={0}>
                <Group gap="xs">
                  <Text fw={700} ff="monospace" style={{ wordBreak: 'break-all' }}>{cliente.clientId}</Text>
                  <Badge color={cliente.activo ? 'green' : 'gray'} variant="light">{cliente.activo ? 'Activo' : 'Inactivo'}</Badge>
                </Group>
                {cliente.nombre && <Text size="sm">{cliente.nombre}</Text>}
                <Group gap={6}>
                  {cliente.scopes.length === 0
                    ? <Text size="sm" c="dimmed">Sin scopes concedidos</Text>
                    : cliente.scopes.map((s) => (
                      <Badge key={s.codigo} variant="outline" tt="none" title={`API dueña: ${s.audiencia}`}>{s.codigo}</Badge>
                    ))}
                </Group>
              </Stack>
              <Menu position="bottom-end">
                <Menu.Target>
                  <Button variant="default" size="xs" aria-label={`Acciones de ${cliente.clientId}`} rightSection={<IconDots size={14} />}>Acciones</Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item onClick={() => { setAviso(''); setGestion(cliente); void pedirCatalogo() }}>Gestionar scopes</Menu.Item>
                  <Menu.Item onClick={() => setConfirmacion({ tipo: 'rotar', cliente })}>Rotar secreto</Menu.Item>
                  {cliente.activo
                    ? <Menu.Item color="red" onClick={() => setConfirmacion({ tipo: 'desactivar', cliente })}>Desactivar</Menu.Item>
                    : <Menu.Item onClick={() => setConfirmacion({ tipo: 'reactivar', cliente })}>Reactivar</Menu.Item>}
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Paper>
        ))}
      </Stack>

      <FormularioAlta api={api} abierto={alta} catalogo={catalogo ?? []}
        onCerrar={() => setAlta(false)}
        onCreado={(clientId, valor) => { setAlta(false); setSecreto({ clientId, valor }); void cargar() }} />
      <PanelScopes api={api} cliente={clienteEnGestion} catalogo={catalogo ?? []}
        onCerrar={() => setGestion(null)}
        onRevocar={(scope) => clienteEnGestion && setConfirmacion({ tipo: 'revocar', cliente: clienteEnGestion, scope })}
        onCambio={(texto) => tras(texto)} />
      <DialogoConfirmacion api={api} confirmacion={confirmacion} onCerrar={() => setConfirmacion(null)}
        onHecho={(texto, nuevoSecreto) => {
          setConfirmacion(null)
          if (nuevoSecreto) setSecreto(nuevoSecreto)
          tras(texto)
        }}
        onIncierto={(texto) => { setConfirmacion(null); tras(texto) }} />
      <DialogoSecreto secreto={secreto} onCerrar={() => setSecreto(null)} />
    </Container>
  )
}

function FormularioAlta({ api, abierto, catalogo, onCerrar, onCreado }: {
  api: Api; abierto: boolean; catalogo: ScopeCatalogo[]
  onCerrar: () => void; onCreado: (clientId: string, secreto: string) => void
}) {
  const [clientId, setClientId] = useState('')
  const [nombre, setNombre] = useState('')
  const [scopes, setScopes] = useState<string[]>([])
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [ocupada, setOcupada] = useState(false)
  const enVuelo = useRef(false)

  useEffect(() => {
    if (abierto) { setClientId(''); setNombre(''); setScopes([]); setErrores({}); setError('') }
  }, [abierto])

  async function enviar() {
    if (enVuelo.current) return
    const locales: Record<string, string> = {}
    if (!CLIENT_ID.test(clientId)) locales.clientId = TEXTOS.clientId
    if (!nombre.trim() || nombre.length > 100) locales.nombre = TEXTOS.nombre
    setErrores(locales); setError('')
    if (Object.keys(locales).length) return
    enVuelo.current = true; setOcupada(true)
    try {
      const creado = await api.crearClienteTecnico(clientId, nombre.trim(), scopes)
      onCreado(creado.clientId, creado.clientSecret)
    } catch (e) {
      const porCampo = erroresPorCampo(e)
      if (Object.keys(porCampo).length) setErrores(porCampo)
      else setError(mensajeCambio(e))
    } finally { enVuelo.current = false; setOcupada(false) }
  }

  return (
    <Modal opened={abierto} onClose={() => { if (!enVuelo.current) onCerrar() }} title="Nuevo cliente técnico"
      closeOnClickOutside={!ocupada} closeOnEscape={!ocupada}>
      <Stack>
        <TextInput label="Identificador (clientId)" description="Ejemplo: modulo-despacho" value={clientId}
          onChange={(e) => setClientId(e.currentTarget.value)} error={errores.clientId} disabled={ocupada} required />
        <TextInput label="Nombre" value={nombre} onChange={(e) => setNombre(e.currentTarget.value)}
          error={errores.nombre} disabled={ocupada} required maxLength={100} />
        <MultiSelect label="Scopes iniciales" placeholder="Opcional" searchable value={scopes} onChange={setScopes}
          data={agrupar(catalogo)} error={errores.scopes} disabled={ocupada} />
        {error && <Alert role="alert" color="red">{error}</Alert>}
        <Group>
          <Button loading={ocupada} disabled={ocupada} onClick={() => void enviar()}>Crear cliente</Button>
          <Button variant="default" disabled={ocupada} onClick={onCerrar}>Cancelar</Button>
        </Group>
      </Stack>
    </Modal>
  )
}

function PanelScopes({ api, cliente, catalogo, onCerrar, onRevocar, onCambio }: {
  api: Api; cliente: ClienteTecnico | null; catalogo: ScopeCatalogo[]
  onCerrar: () => void; onRevocar: (scope: string) => void; onCambio: (texto: string) => void
}) {
  const [elegido, setElegido] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [ocupada, setOcupada] = useState(false)
  const enVuelo = useRef(false)
  const concedidos = new Set(cliente?.scopes.map((s) => s.codigo))
  const disponibles = catalogo.filter((s) => !concedidos.has(s.codigo))

  async function conceder() {
    if (!cliente || !elegido || enVuelo.current) return
    enVuelo.current = true; setOcupada(true); setError('')
    try {
      await api.concederScope(cliente.clientId, elegido)
      setElegido(null); onCambio(`Scope ${elegido} concedido a ${cliente.clientId}.`)
    } catch (e) { setError(mensajeCambio(e)) } finally { enVuelo.current = false; setOcupada(false) }
  }

  return (
    <Modal opened={cliente !== null} onClose={() => { if (!enVuelo.current) { setError(''); onCerrar() } }}
      title={cliente ? `Scopes de ${cliente.clientId}` : ''} size="lg">
      {cliente && (
        <Stack>
          {cliente.scopes.length === 0 && <Text size="sm" c="dimmed">Sin scopes concedidos</Text>}
          {cliente.scopes.map((s) => (
            <Group key={s.codigo} justify="space-between">
              <Text ff="monospace" size="sm">{s.codigo} <Text span c="dimmed">({s.audiencia})</Text></Text>
              <Button size="xs" variant="light" color="red" onClick={() => onRevocar(s.codigo)}>Revocar</Button>
            </Group>
          ))}
          <Group align="flex-end">
            <Select label="Conceder un scope" placeholder="Elige del catálogo" searchable value={elegido}
              onChange={setElegido} data={agrupar(disponibles)} disabled={ocupada} style={{ flex: 1 }} />
            <Button loading={ocupada} disabled={!elegido || ocupada} onClick={() => void conceder()}>Conceder</Button>
          </Group>
          {error && <Alert role="alert" color="red">{error}</Alert>}
        </Stack>
      )}
    </Modal>
  )
}

function DialogoConfirmacion({ api, confirmacion, onCerrar, onHecho, onIncierto }: {
  api: Api; confirmacion: Confirmacion | null; onCerrar: () => void
  onHecho: (texto: string, secreto?: { clientId: string; valor: string }) => void; onIncierto: (texto: string) => void
}) {
  const [error, setError] = useState('')
  const [ocupada, setOcupada] = useState(false)
  const enVuelo = useRef(false)
  if (!confirmacion) return null
  const { tipo, cliente } = confirmacion
  const titulo = { rotar: 'Rotar el secreto', desactivar: 'Desactivar el cliente', reactivar: 'Reactivar el cliente', revocar: 'Revocar el scope' }[tipo]
  const texto = { rotar: TEXTOS.confirmarRotar, desactivar: TEXTOS.confirmarDesactivar, reactivar: TEXTOS.confirmarReactivar, revocar: TEXTOS.confirmarRevocar }[tipo]

  async function confirmar() {
    if (!confirmacion || enVuelo.current) return
    enVuelo.current = true; setOcupada(true); setError('')
    try {
      if (confirmacion.tipo === 'rotar') {
        const rotado = await api.rotarSecretoClienteTecnico(cliente.clientId)
        onHecho(`Secreto de ${cliente.clientId} rotado.`, { clientId: cliente.clientId, valor: rotado.clientSecret })
      } else if (confirmacion.tipo === 'revocar') {
        await api.revocarScope(cliente.clientId, confirmacion.scope)
        onHecho(`Scope ${confirmacion.scope} revocado a ${cliente.clientId}.`)
      } else {
        await api.cambiarEstadoClienteTecnico(cliente.clientId, confirmacion.tipo === 'reactivar')
        onHecho(`Cliente ${cliente.clientId} ${confirmacion.tipo === 'reactivar' ? 'reactivado' : 'desactivado'}.`)
      }
    } catch (e) {
      if (confirmacion.tipo === 'rotar' && e instanceof RedError) onIncierto(TEXTOS.rotacionIncierta)
      else if (e instanceof ApiError && e.code === 'NO_ENCONTRADO') onIncierto(TEXTOS.noExiste)
      else setError(mensajeCambio(e))
    } finally { enVuelo.current = false; setOcupada(false) }
  }

  return (
    <Modal opened onClose={() => { if (!enVuelo.current) { setError(''); onCerrar() } }}
      title={`${titulo}: ${cliente.clientId}`} closeOnClickOutside={!ocupada} closeOnEscape={!ocupada}>
      <Stack>
        <Text>{texto}</Text>
        {confirmacion.tipo === 'revocar' && <Code>{confirmacion.scope}</Code>}
        {error && <Alert role="alert" color="red">{error}</Alert>}
        <Group>
          <Button color={tipo === 'reactivar' ? undefined : 'red'} loading={ocupada} disabled={ocupada}
            onClick={() => void confirmar()}>Confirmar</Button>
          <Button variant="default" disabled={ocupada} onClick={() => { setError(''); onCerrar() }}>Cancelar</Button>
        </Group>
      </Stack>
    </Modal>
  )
}

function DialogoSecreto({ secreto, onCerrar }: { secreto: { clientId: string; valor: string } | null; onCerrar: () => void }) {
  const [guardado, setGuardado] = useState(false)
  useEffect(() => { setGuardado(false) }, [secreto])
  return (
    <Modal opened={secreto !== null} onClose={() => { if (guardado) onCerrar() }} withCloseButton={false}
      closeOnClickOutside={false} closeOnEscape={false} title={secreto ? `Secreto de ${secreto.clientId}` : ''}>
      {secreto && (
        <Stack role="alertdialog" aria-label={`Secreto de ${secreto.clientId}`}>
          <Alert color="yellow">{TEXTOS.avisoSecreto}</Alert>
          <Code block style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }} data-testid="secreto">{secreto.valor}</Code>
          <CopyButton value={secreto.valor}>
            {({ copied, copy }) => (
              <Stack gap={4}>
                <Button variant="light" onClick={copy}>{copied ? 'Copiado' : 'Copiar'}</Button>
                <Text size="sm" aria-live="polite">{copied ? 'Secreto copiado al portapapeles.' : ''}</Text>
              </Stack>
            )}
          </CopyButton>
          <Checkbox label="Ya guardé el secreto" checked={guardado} onChange={(e) => setGuardado(e.currentTarget.checked)} />
          <Button disabled={!guardado} onClick={onCerrar}>Cerrar</Button>
        </Stack>
      )}
    </Modal>
  )
}

function agrupar(catalogo: ScopeCatalogo[]) {
  const grupos = new Map<string, { value: string; label: string }[]>()
  for (const s of catalogo) {
    const lista = grupos.get(s.audiencia) ?? []
    lista.push({ value: s.codigo, label: s.descripcion ? `${s.codigo} — ${s.descripcion}` : s.codigo })
    grupos.set(s.audiencia, lista)
  }
  return [...grupos].map(([group, items]) => ({ group, items }))
}
