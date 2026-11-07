// FEAT-04-T6 — SeccionAtributosVendedor (FRONT-08, SPEC-16 RF-16.8). Solo si la cuenta tiene
// VENDEDOR. Edita código, tienda y fecha de ingreso con PATCH /usuarios/{id}/atributos enviando
// solo lo que cambió; un campo vaciado viaja como null. Ocultar el botón no autoriza: el backend
// revalida atributos.editar.
// H-01: GET /usuarios/{id} aún no devuelve estos campos; se muestran los de la respuesta del PATCH.
import { Alert, Button, Group, Paper, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconPencil } from '@tabler/icons-react'
import { useState, type FormEvent } from 'react'
import type { Api } from '../../shared/api'
import { ApiError, erroresPorCampo, mensajeDeError } from '../../shared/errores'
import { PERMISO_EDITAR_ATRIBUTOS } from '../../shared/navegacion'
import { useSesion } from '../../shared/sesion'
import type { Usuario } from '../../shared/tipos'
import { validarAtributosVendedor, type CamposVendedor } from './validarAtributosVendedor'

const CLAVES = ['codigoVendedor', 'tienda', 'fechaIngreso'] as const

function camposDe(u: Pick<Usuario, (typeof CLAVES)[number]>): CamposVendedor {
  return { codigoVendedor: u.codigoVendedor ?? '', tienda: u.tienda ?? '', fechaIngreso: u.fechaIngreso ?? '' }
}

function mensajeAtributos(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'ATRIBUTO_NO_APLICABLE') return 'Ese dato no aplica a una cuenta con estos roles.'
    if (error.code === 'NO_ENCONTRADO') return 'Esa cuenta ya no existe.'
  }
  return mensajeDeError(error)
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {etiqueta}
      </Text>
      <Text>{valor || '—'}</Text>
    </Stack>
  )
}

export function SeccionAtributosVendedor({ api, usuario }: { api: Api; usuario: Usuario }) {
  const { tienePermiso } = useSesion()
  const [guardados, setGuardados] = useState<CamposVendedor>(() => camposDe(usuario))
  const [campos, setCampos] = useState<CamposVendedor>(guardados)
  const [editando, setEditando] = useState(false)
  const [errores, setErrores] = useState<Partial<Record<keyof CamposVendedor, string>>>({})
  const [general, setGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (!usuario.roles.includes('VENDEDOR')) return null
  const puedeEditar = tienePermiso(PERMISO_EDITAR_ATRIBUTOS)

  function abrir() {
    setCampos(guardados)
    setErrores({})
    setGeneral(null)
    setEditando(true)
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    if (enviando) return
    const e = validarAtributosVendedor(campos)
    setErrores(e)
    setGeneral(null)
    if (Object.keys(e).length) return
    const cambios: Partial<Record<keyof CamposVendedor, string | null>> = {}
    for (const clave of CLAVES) {
      const valor = campos[clave].trim()
      if (valor !== guardados[clave].trim()) cambios[clave] = valor === '' ? null : valor
    }
    if (Object.keys(cambios).length === 0) {
      setEditando(false)
      return
    }
    setEnviando(true)
    try {
      const actualizado = await api.actualizarAtributosVendedor(usuario.id, cambios)
      setGuardados(camposDe(actualizado))
      notifications.show({ color: 'green', message: 'Guardamos los atributos de vendedor.' })
      setEditando(false)
    } catch (err) {
      const porCampo = erroresPorCampo(err)
      if (Object.keys(porCampo).length) setErrores(porCampo)
      else setGeneral(mensajeAtributos(err))
    } finally {
      setEnviando(false)
    }
  }

  const cambiar = (clave: keyof CamposVendedor) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCampos({ ...campos, [clave]: e.currentTarget.value })

  return (
    <Paper withBorder p="lg" radius="md" component="section" aria-label="Atributos de vendedor">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Title order={2} size="h4">
            Atributos de vendedor
          </Title>
          {puedeEditar && !editando && (
            <Button variant="light" size="xs" leftSection={<IconPencil size={14} />} onClick={abrir}>
              Editar atributos
            </Button>
          )}
        </Group>

        {!editando && (
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <Dato etiqueta="Código de vendedor" valor={guardados.codigoVendedor} />
            <Dato etiqueta="Tienda" valor={guardados.tienda} />
            <Dato etiqueta="Fecha de ingreso" valor={guardados.fechaIngreso} />
          </SimpleGrid>
        )}

        {editando && (
          <form onSubmit={guardar} noValidate>
            <Stack gap="sm">
              {general && (
                <Alert color="red" role="alert">
                  {general}
                </Alert>
              )}
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                <TextInput label="Código de vendedor" value={campos.codigoVendedor} onChange={cambiar('codigoVendedor')}
                  error={errores.codigoVendedor} maxLength={50} />
                <TextInput label="Tienda" value={campos.tienda} onChange={cambiar('tienda')} error={errores.tienda}
                  maxLength={100} />
                <TextInput label="Fecha de ingreso" placeholder="AAAA-MM-DD" value={campos.fechaIngreso}
                  onChange={cambiar('fechaIngreso')} error={errores.fechaIngreso} />
              </SimpleGrid>
              <Group justify="flex-end">
                <Button variant="default" onClick={() => setEditando(false)} disabled={enviando}>
                  Cancelar
                </Button>
                <Button type="submit" loading={enviando}>
                  Guardar
                </Button>
              </Group>
            </Stack>
          </form>
        )}
      </Stack>
    </Paper>
  )
}
