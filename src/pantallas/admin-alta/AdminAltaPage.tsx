// FRONT-11 — Alta administrativa de una cuenta de personal (SPEC-03 RF-03.1, FEAT-13-T2). Sin contraseña:
// la cuenta nace pendiente y su titular la activa con el enlace de 72 horas (A6). «Sin rol» omite `rol`.
// Tras crear, el detalle solo se ofrece con usuario.ver (UI-11.6).
import { Alert, Anchor, Button, Code, Container, Group, NativeSelect, Paper, Stack, Text, TextInput, Title } from '@mantine/core'
import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import type { Api } from '../../shared/api'
import { ApiError, MENSAJES, erroresPorCampo, mensajeDeError } from '../../shared/errores'
import { ETIQUETA_ROL, ROLES_DE_GESTION } from '../../shared/etiquetas'
import { PERMISO_VER_USUARIOS } from '../../shared/navegacion'
import { useSesion } from '../../shared/sesion'
import type { CodigoRol, Usuario } from '../../shared/tipos'
import { ROLES_ALTA, peticionAlta, validarAlta, type CampoAlta, type ValoresAlta } from './validarAlta'

export const TEXTOS_ALTA = {
  creada: 'Cuenta creada, pendiente de activación. Su titular recibirá un enlace válido por 72 horas.',
  gestion: 'Al activar la cuenta, este rol exige segundo factor y caducidad de contraseña según la política vigente.',
  correoNoDisponible: 'Ese correo no se puede usar para una cuenta nueva.',
} as const

const INICIALES: ValoresAlta = { correo: '', nombres: '', apellidos: '', rol: '' }

export function AdminAltaPage({ api }: { api: Api }) {
  const { tienePermiso } = useSesion()
  const puedeVer = tienePermiso(PERMISO_VER_USUARIOS)
  const [valores, setValores] = useState<ValoresAlta>(INICIALES)
  const [errores, setErrores] = useState<Partial<Record<CampoAlta, string>>>({})
  const [general, setGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [creada, setCreada] = useState<Usuario | null>(null)
  const campos = useRef<Partial<Record<CampoAlta, HTMLElement | null>>>({})

  function cambiar(campo: CampoAlta, valor: string) {
    setValores((v) => ({ ...v, [campo]: valor }))
    setErrores((e) => ({ ...e, [campo]: undefined }))
  }

  function enfocarPrimerError(encontrados: Partial<Record<CampoAlta, string>>) {
    const primero = (['correo', 'nombres', 'apellidos', 'rol'] as const).find((c) => encontrados[c])
    if (primero) campos.current[primero]?.focus()
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (enviando) return
    setGeneral(null)
    const locales = validarAlta(valores)
    setErrores(locales)
    if (Object.keys(locales).length) {
      enfocarPrimerError(locales)
      return
    }
    setEnviando(true)
    try {
      setCreada(await api.crearUsuario(peticionAlta(valores)))
    } catch (error) {
      if (error instanceof ApiError && error.code === 'CORREO_NO_DISPONIBLE') {
        setErrores({ correo: TEXTOS_ALTA.correoNoDisponible })
        enfocarPrimerError({ correo: TEXTOS_ALTA.correoNoDisponible })
      } else if (error instanceof ApiError && error.code === 'VALIDACION') {
        const delServidor = erroresPorCampo(error)
        const conocidos: Partial<Record<CampoAlta, string>> = {}
        for (const campo of ['correo', 'nombres', 'apellidos', 'rol'] as const) {
          if (delServidor[campo]) conocidos[campo] = delServidor[campo]
        }
        setErrores(conocidos)
        if (Object.keys(conocidos).length) enfocarPrimerError(conocidos)
        else setGeneral(MENSAJES.validacionCampo)
      } else {
        setGeneral(mensajeDeError(error))
      }
    } finally {
      setEnviando(false)
    }
  }

  function otraCuenta() {
    setCreada(null)
    setValores(INICIALES)
    setErrores({})
  }

  const esGestion = valores.rol !== '' && ROLES_DE_GESTION.includes(valores.rol)

  return (
    <Container size="sm" py="md">
      <Stack gap="md">
        {puedeVer && (
          <Anchor component={Link} to="/admin/usuarios" size="sm">
            Volver al listado
          </Anchor>
        )}
        <Title order={1} size="h2">
          Nueva cuenta de personal
        </Title>
        {creada ? (
          <Paper withBorder p="lg" radius="md">
            <Stack gap="sm">
              <Alert color="green" variant="light" role="status" title="Cuenta creada">
                {TEXTOS_ALTA.creada}
              </Alert>
              <Text size="sm">
                <strong>{creada.correo}</strong> ·{' '}
                {creada.roles.length ? creada.roles.map((r) => ETIQUETA_ROL[r]).join(', ') : 'Sin rol'}
              </Text>
              <Text size="sm">
                Identificador de la cuenta: <Code>{creada.id}</Code>
              </Text>
              <Group gap="sm">
                {puedeVer && (
                  <Button component={Link} to={`/admin/usuarios/${creada.id}`}>
                    Ver detalle
                  </Button>
                )}
                <Button variant="light" onClick={otraCuenta}>
                  Crear otra cuenta
                </Button>
              </Group>
            </Stack>
          </Paper>
        ) : (
          <Paper withBorder p="lg" radius="md">
            <form onSubmit={enviar} noValidate>
              <Stack gap="md">
                <Text size="sm" c="dimmed">
                  No defines ninguna contraseña: la persona recibirá por correo un enlace para activar su cuenta,
                  elegir su contraseña y aceptar los términos.
                </Text>
                {general && (
                  <Alert color="red" role="alert">
                    {general}
                  </Alert>
                )}
                <TextInput
                  ref={(el) => { campos.current.correo = el }}
                  label="Correo"
                  type="email"
                  autoComplete="off"
                  value={valores.correo}
                  onChange={(e) => cambiar('correo', e.currentTarget.value)}
                  error={errores.correo}
                  required
                />
                <TextInput
                  ref={(el) => { campos.current.nombres = el }}
                  label="Nombres"
                  autoComplete="off"
                  value={valores.nombres}
                  onChange={(e) => cambiar('nombres', e.currentTarget.value)}
                  error={errores.nombres}
                  required
                />
                <TextInput
                  ref={(el) => { campos.current.apellidos = el }}
                  label="Apellidos"
                  autoComplete="off"
                  value={valores.apellidos}
                  onChange={(e) => cambiar('apellidos', e.currentTarget.value)}
                  error={errores.apellidos}
                  required
                />
                <NativeSelect
                  ref={(el) => { campos.current.rol = el }}
                  label="Rol"
                  value={valores.rol}
                  onChange={(e) => cambiar('rol', e.currentTarget.value as CodigoRol | '')}
                  error={errores.rol}
                  data={[{ value: '', label: 'Sin rol' }, ...ROLES_ALTA.map((r) => ({ value: r, label: ETIQUETA_ROL[r] }))]}
                  description="«Sin rol» sirve para personas cuyo perfil vive en otro módulo, como un repartidor de Despacho."
                />
                {esGestion && (
                  <Alert color="blue" variant="light" role="note">
                    {TEXTOS_ALTA.gestion}
                  </Alert>
                )}
                <Group justify="flex-end" gap="sm">
                  {puedeVer && (
                    <Button component={Link} to="/admin/usuarios" variant="default">
                      Cancelar
                    </Button>
                  )}
                  <Button type="submit" loading={enviando} disabled={enviando}>
                    {enviando ? 'Creando…' : 'Crear cuenta'}
                  </Button>
                </Group>
              </Stack>
            </form>
          </Paper>
        )}
      </Stack>
    </Container>
  )
}
