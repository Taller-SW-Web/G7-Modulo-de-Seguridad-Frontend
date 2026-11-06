// FRONT-06 · cambio de correo (FEAT-04-T4, UI-06.4 y UI-06.5): POST /usuarios/{id}/correo con la
// contraseña actual. Un 202 solo significa «enlace enviado»: el correo visible no cambia hasta que se
// confirme. CREDENCIALES_INVALIDAS aquí es «contraseña actual incorrecta» y no cierra la sesión
// (el cliente HTTP solo renueva ante TOKEN_INVALIDO). Nunca se muestra `detail` ni la contraseña.
import { Alert, Button, Group, Modal, PasswordInput, Stack, TextInput } from '@mantine/core'
import { useRef, useState, type FormEvent } from 'react'
import type { Api } from '../../shared/api'
import { ApiError, erroresPorCampo, mensajeDeError } from '../../shared/errores'
import type { Usuario } from '../../shared/tipos'
import { validarCorreo, type CamposCorreo } from './validarCorreo'

const MENSAJE_CONTRASENA_INCORRECTA = 'La contraseña actual no es correcta.'
const MENSAJE_CORREO_NO_DISPONIBLE = 'No puedes usar ese correo. Prueba con otro.'

type Errores = Partial<Record<keyof CamposCorreo, string>>

function Formulario({ api, perfil, onCerrar, onSolicitado, onEnviando }: {
  api: Api
  perfil: Pick<Usuario, 'id' | 'correo'>
  onCerrar: () => void
  onSolicitado: (nuevoCorreo: string) => void
  onEnviando: (enviando: boolean) => void
}) {
  const [nuevoCorreo, setNuevoCorreo] = useState('')
  const [contrasenaActual, setContrasenaActual] = useState('')
  const [errores, setErrores] = useState<Errores>({})
  const [general, setGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const refCorreo = useRef<HTMLInputElement>(null)
  const refContrasena = useRef<HTMLInputElement>(null)
  const enCurso = useRef(false) // evita un segundo envío antes de que React pinte «enviando»

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (enCurso.current) return
    const invalidos = validarCorreo({ nuevoCorreo, contrasenaActual }, perfil.correo)
    setErrores(invalidos)
    setGeneral(null)
    if (Object.keys(invalidos).length) return
    const correo = nuevoCorreo.trim()
    enCurso.current = true
    setEnviando(true)
    onEnviando(true)
    try {
      await api.solicitarCambioCorreo(perfil.id, correo, contrasenaActual)
      onSolicitado(correo)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CREDENCIALES_INVALIDAS') {
        setContrasenaActual('')
        setErrores({ contrasenaActual: MENSAJE_CONTRASENA_INCORRECTA })
        refContrasena.current?.focus()
      } else if (err instanceof ApiError && (err.code === 'CORREO_NO_DISPONIBLE' || err.status === 409)) {
        setErrores({ nuevoCorreo: MENSAJE_CORREO_NO_DISPONIBLE })
        refCorreo.current?.focus()
      } else {
        const porCampo = erroresPorCampo(err)
        const delServidor: Errores = {}
        if (porCampo.nuevoCorreo) delServidor.nuevoCorreo = 'Escribe un correo válido.'
        if (porCampo.contrasenaActual) delServidor.contrasenaActual = 'Escribe tu contraseña actual.'
        if (Object.keys(delServidor).length) setErrores(delServidor)
        else setGeneral(mensajeDeError(err))
      }
    } finally {
      enCurso.current = false
      setEnviando(false)
      onEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} noValidate>
      <Stack gap="sm">
        {general && (
          <Alert color="red" role="alert">
            {general}
          </Alert>
        )}
        <TextInput
          ref={refCorreo}
          label="Correo nuevo"
          type="email"
          autoComplete="off"
          data-autofocus
          value={nuevoCorreo}
          onChange={(e) => setNuevoCorreo(e.currentTarget.value)}
          error={errores.nuevoCorreo}
        />
        <PasswordInput
          ref={refContrasena}
          label="Contraseña actual"
          autoComplete="current-password"
          value={contrasenaActual}
          onChange={(e) => setContrasenaActual(e.currentTarget.value)}
          error={errores.contrasenaActual}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" loading={enviando}>
            Enviar enlace
          </Button>
        </Group>
      </Stack>
    </form>
  )
}

export function CambioCorreo({ api, perfil, abierto, onCerrar, onSolicitado }: {
  api: Api
  perfil: Pick<Usuario, 'id' | 'correo'>
  abierto: boolean
  onCerrar: () => void
  onSolicitado: (nuevoCorreo: string) => void
}) {
  const [enviando, setEnviando] = useState(false)
  return (
    <Modal
      opened={abierto}
      onClose={() => {
        if (!enviando) onCerrar()
      }}
      closeOnEscape={!enviando}
      closeOnClickOutside={!enviando}
      title="Cambiar correo"
      centered
    >
      {/* Se desmonta al cerrar: la contraseña y el correo escritos no sobreviven al diálogo. */}
      <Formulario api={api} perfil={perfil} onCerrar={onCerrar} onSolicitado={onSolicitado} onEnviando={setEnviando} />
    </Modal>
  )
}
