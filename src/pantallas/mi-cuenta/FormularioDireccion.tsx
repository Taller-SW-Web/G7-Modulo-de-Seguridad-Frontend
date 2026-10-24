// FRONT-06 «Nueva dirección» (FEAT-04-T4): POST /usuarios/{id}/direcciones. Solo alta (H-04).
import { Alert, Button, Checkbox, Group, SimpleGrid, Stack, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useState, type FormEvent } from 'react'
import type { Api } from '../../shared/api'
import { erroresPorCampo, mensajeDeError } from '../../shared/errores'
import type { NuevaDireccion } from '../../shared/tipos'
import { validarDireccion, type CamposDireccion, type ErroresDireccion } from './validarDireccion'

const VACIOS: CamposDireccion = {
  etiqueta: '', departamento: '', provincia: '', distrito: '', direccion: '', referencia: '', esPredeterminada: false,
}

export function FormularioDireccion({ api, usuarioId, onGuardada, onCancelar }: {
  api: Api
  usuarioId: string
  onGuardada: () => void
  onCancelar: () => void
}) {
  const [campos, setCampos] = useState<CamposDireccion>(VACIOS)
  const [errores, setErrores] = useState<ErroresDireccion>({})
  const [general, setGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    if (enviando) return
    const e = validarDireccion(campos)
    setErrores(e)
    setGeneral(null)
    if (Object.keys(e).length) return
    setEnviando(true)
    try {
      const etiqueta = campos.etiqueta.trim()
      const referencia = campos.referencia.trim()
      const nueva: NuevaDireccion = {
        departamento: campos.departamento.trim(),
        provincia: campos.provincia.trim(),
        distrito: campos.distrito.trim(),
        direccion: campos.direccion.trim(),
        esPredeterminada: campos.esPredeterminada,
      }
      if (etiqueta) nueva.etiqueta = etiqueta
      if (referencia) nueva.referencia = referencia
      await api.crearDireccion(usuarioId, nueva)
      notifications.show({ color: 'green', message: 'Guardamos tu dirección.' })
      onGuardada()
    } catch (err) {
      const porCampo = erroresPorCampo(err)
      if (Object.keys(porCampo).length) setErrores(porCampo)
      else setGeneral(mensajeDeError(err))
    } finally {
      setEnviando(false)
    }
  }

  const cambiar = (clave: Exclude<keyof CamposDireccion, 'esPredeterminada'>) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCampos({ ...campos, [clave]: e.currentTarget.value })

  return (
    <form onSubmit={guardar} noValidate aria-label="Nueva dirección">
      <Stack gap="sm">
        {general && (
          <Alert color="red" role="alert">
            {general}
          </Alert>
        )}
        <TextInput label="Etiqueta" placeholder="Casa, trabajo…" value={campos.etiqueta} onChange={cambiar('etiqueta')}
          error={errores.etiqueta} />
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          <TextInput label="Departamento" value={campos.departamento} onChange={cambiar('departamento')}
            error={errores.departamento} required />
          <TextInput label="Provincia" value={campos.provincia} onChange={cambiar('provincia')}
            error={errores.provincia} required />
          <TextInput label="Distrito" value={campos.distrito} onChange={cambiar('distrito')}
            error={errores.distrito} required />
        </SimpleGrid>
        <TextInput label="Dirección" value={campos.direccion} onChange={cambiar('direccion')}
          error={errores.direccion} required />
        <TextInput label="Referencia" value={campos.referencia} onChange={cambiar('referencia')}
          error={errores.referencia} />
        <Checkbox label="Usar como predeterminada" checked={campos.esPredeterminada}
          onChange={(e) => setCampos({ ...campos, esPredeterminada: e.currentTarget.checked })} />
        <Group justify="flex-end">
          <Button variant="default" onClick={onCancelar} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" loading={enviando}>
            Guardar dirección
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
