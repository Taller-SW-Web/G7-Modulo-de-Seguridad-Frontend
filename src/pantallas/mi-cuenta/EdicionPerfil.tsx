// FRONT-06 edición propia (EP-08-T006): PATCH /usuarios/{id}/atributos solo con los campos
// cambiados. Nombres, apellidos y celular (+51 y 9 dígitos), según AtributosUsuario.
import { Alert, Button, Group, Stack, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useState, type FormEvent } from 'react'
import type { Api } from '../../shared/api'
import { erroresPorCampo, mensajeDeError } from '../../shared/errores'
import type { Usuario } from '../../shared/tipos'
import { validarPerfil, type Campos } from './validarPerfil'

export function EdicionPerfil({ api, perfil, onGuardado, onCancelar }: {
  api: Api
  perfil: Usuario
  onGuardado: (actualizado: Usuario) => void
  onCancelar: () => void
}) {
  const inicial: Campos = { nombres: perfil.nombres ?? '', apellidos: perfil.apellidos ?? '', celular: perfil.celular ?? '' }
  const [campos, setCampos] = useState<Campos>(inicial)
  const [errores, setErrores] = useState<Partial<Record<keyof Campos, string>>>({})
  const [general, setGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    const e = validarPerfil(campos)
    setErrores(e)
    setGeneral(null)
    if (Object.keys(e).length || enviando) return
    const cambios: Partial<Campos> = {}
    for (const clave of ['nombres', 'apellidos', 'celular'] as const) {
      const valor = campos[clave].trim()
      if (valor !== inicial[clave].trim() && !(clave === 'celular' && !valor)) cambios[clave] = valor
    }
    if (Object.keys(cambios).length === 0) {
      onCancelar()
      return
    }
    setEnviando(true)
    try {
      const actualizado = await api.actualizarPerfilPropio(perfil.id, cambios)
      notifications.show({ color: 'green', message: 'Guardamos tus datos.' })
      onGuardado(actualizado)
    } catch (err) {
      const porCampo = erroresPorCampo(err)
      if (Object.keys(porCampo).length) setErrores(porCampo)
      else setGeneral(mensajeDeError(err))
    } finally {
      setEnviando(false)
    }
  }

  const cambiar = (clave: keyof Campos) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCampos({ ...campos, [clave]: e.currentTarget.value })

  return (
    <form onSubmit={guardar} noValidate>
      <Stack gap="sm">
        {general && (
          <Alert color="red" role="alert">
            {general}
          </Alert>
        )}
        <TextInput label="Nombres" value={campos.nombres} onChange={cambiar('nombres')} error={errores.nombres} required />
        <TextInput label="Apellidos" value={campos.apellidos} onChange={cambiar('apellidos')} error={errores.apellidos} required />
        <TextInput label="Celular" placeholder="+51987654321" value={campos.celular} onChange={cambiar('celular')}
          error={errores.celular} />
        <Group justify="flex-end">
          <Button variant="default" onClick={onCancelar} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" loading={enviando}>
            Guardar
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
