// FRONT-02 — Registro de cliente (SPEC-01, FEAT-01-T5). Siempre canalOrigen WEB y sin sesión al
// terminar: pasa a FRONT-03 con el correo solo en memoria (estado de navegación).
import { Alert, Anchor, Button, Center, Checkbox, List, Paper, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { MedidorPassword } from '../../componentes/MedidorPassword'
import type { Api } from '../../shared/api'
import { ApiError, erroresPorCampo, mensajeDeError } from '../../shared/errores'
import type { PoliticaPassword } from '../../shared/tipos'
import {
  MENSAJES_REGISTRO, ORDEN_CAMPOS, contieneDatosPersonales, mensajesPolitica, validarCampo, validarTodo,
  type CampoRegistro, type ValoresRegistro,
} from './validarRegistro'

const INICIALES: ValoresRegistro = {
  nombres: '', apellidos: '', correo: '', celular: '', contrasena: '', confirmacion: '', aceptaTerminos: false,
}

/** Mensajes propios de FRONT-02 para estos campos aunque el backend envíe otro texto. */
const MENSAJE_FIJO: Partial<Record<CampoRegistro, string>> = {
  celular: MENSAJES_REGISTRO.celular,
  aceptaTerminos: MENSAJES_REGISTRO.aceptaTerminos,
}

export function RegistroPage({ api }: { api: Api }) {
  const navegar = useNavigate()
  const [valores, setValores] = useState<ValoresRegistro>(INICIALES)
  const [tocados, setTocados] = useState<ReadonlySet<CampoRegistro>>(new Set())
  const [errores, setErrores] = useState<Partial<Record<CampoRegistro, string>>>({})
  const [resumen, setResumen] = useState(false)
  const [politica, setPolitica] = useState<PoliticaPassword | null>(null)
  const [rechazadas, setRechazadas] = useState<ReadonlySet<string>>(new Set())
  const [correoNoDisponible, setCorreoNoDisponible] = useState(false)
  const [general, setGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const campos = useRef<Partial<Record<CampoRegistro, HTMLInputElement | null>>>({})
  const alerta = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const control = new AbortController()
    api.politicaPassword(control.signal).then(setPolitica).catch(() => setPolitica(null))
    return () => control.abort()
  }, [api])

  // El historial no aplica a una cuenta nueva (FRONT-00 §3): solo FRONT-05 y FRONT-10.
  const politicaRegistro = politica ? { ...politica, historial: 0 } : null
  const reglasMarcadas = new Set(rechazadas)
  if (politica?.rechazaDatosPersonales && contieneDatosPersonales(valores)) reglasMarcadas.add('DATOS_PERSONALES')

  function cambiar<K extends keyof ValoresRegistro>(campo: K, valor: ValoresRegistro[K]) {
    const siguientes = { ...valores, [campo]: valor }
    setValores(siguientes)
    if (campo === 'contrasena') {
      setRechazadas(new Set())
    }
    // Un campo ya revisado se vuelve a validar mientras se corrige; los demás, al salir de ellos.
    setErrores((previos) => {
      const nuevos = { ...previos }
      for (const c of [campo as CampoRegistro, ...(campo === 'contrasena' ? (['confirmacion'] as const) : [])]) {
        if (tocados.has(c)) {
          const error = validarCampo(c, siguientes)
          if (error) nuevos[c] = error
          else delete nuevos[c]
        }
      }
      return nuevos
    })
  }

  function salir(campo: CampoRegistro) {
    setTocados((previos) => new Set(previos).add(campo))
    const error = validarCampo(campo, valores)
    setErrores((previos) => {
      const nuevos = { ...previos }
      if (error) nuevos[campo] = error
      else delete nuevos[campo]
      return nuevos
    })
  }

  function mostrarErrores(nuevos: Partial<Record<CampoRegistro, string>>) {
    setErrores(nuevos)
    setResumen(true)
    const primero = ORDEN_CAMPOS.find((campo) => nuevos[campo])
    if (primero) queueMicrotask(() => campos.current[primero]?.focus())
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (enviando) return
    setGeneral(null)
    setCorreoNoDisponible(false)
    setTocados(new Set(ORDEN_CAMPOS))
    const delCliente = validarTodo(valores)
    if (Object.keys(delCliente).length > 0) {
      mostrarErrores(delCliente)
      return
    }
    setResumen(false)
    setEnviando(true)
    const correo = valores.correo.trim()
    try {
      await api.registrar({
        correo,
        contrasena: valores.contrasena,
        nombres: valores.nombres.trim(),
        apellidos: valores.apellidos.trim(),
        celular: `+51${valores.celular}`,
        aceptaTerminos: true,
        canalOrigen: 'WEB',
      })
      navegar('/verificar-correo', { state: { correo } })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'VALIDACION') {
        const delServidor: Partial<Record<CampoRegistro, string>> = {}
        for (const [campo, mensaje] of Object.entries(erroresPorCampo(error))) {
          if ((ORDEN_CAMPOS as readonly string[]).includes(campo)) {
            const c = campo as CampoRegistro
            delServidor[c] = MENSAJE_FIJO[c] ?? mensaje
          }
        }
        if (Object.keys(delServidor).length > 0) mostrarErrores(delServidor)
        else setGeneral(mensajeDeError(error))
      } else if (error instanceof ApiError && error.code === 'POLITICA_INCUMPLIDA') {
        const lista = error.problem.errores ?? []
        setRechazadas(new Set(lista.map((item) => item.regla ?? '').filter(Boolean)))
        mostrarErrores({ contrasena: mensajesPolitica(lista).join(' ') })
      } else if (error instanceof ApiError && error.code === 'CORREO_NO_DISPONIBLE') {
        setCorreoNoDisponible(true)
        queueMicrotask(() => alerta.current?.focus())
      } else {
        setGeneral(mensajeDeError(error))
        queueMicrotask(() => alerta.current?.focus())
      }
    } finally {
      setEnviando(false)
    }
  }

  const listaErrores = ORDEN_CAMPOS.filter((campo) => errores[campo])
  const registrarCampo = (campo: CampoRegistro) => (elemento: HTMLInputElement | null) => {
    campos.current[campo] = elemento
  }

  return (
    <Center mih="100dvh" bg="cloud.2" p="md">
      <Paper withBorder shadow="sm" p="xl" w="100%" maw={480} radius="md">
        <form onSubmit={enviar} noValidate>
          <Stack gap="md">
            <Title order={1} size="h3">Crear una cuenta</Title>

            {resumen && listaErrores.length > 0 && (
              <Alert color="red" variant="light" role="alert" title="Revisa los campos marcados">
                <List size="sm">
                  {listaErrores.map((campo) => <List.Item key={campo}>{errores[campo]}</List.Item>)}
                </List>
              </Alert>
            )}
            {correoNoDisponible && (
              <Alert ref={alerta} tabIndex={-1} color="yellow" variant="light" role="alert">
                <Text size="sm">{MENSAJES_REGISTRO.correoNoDisponible}</Text>
                <Stack gap={4} mt="xs">
                  <Anchor component={Link} to="/login" size="sm">Iniciar sesión</Anchor>
                  <Anchor component={Link} to="/recuperar-contrasena" state={{ correo: valores.correo.trim() }} size="sm">
                    Recuperar mi contraseña
                  </Anchor>
                </Stack>
              </Alert>
            )}
            {general && (
              <Alert ref={alerta} tabIndex={-1} color="red" variant="light" role="alert">{general}</Alert>
            )}

            <TextInput
              ref={registrarCampo('nombres')} label="Nombres" autoComplete="given-name" required
              value={valores.nombres} onChange={(e) => cambiar('nombres', e.currentTarget.value)}
              onBlur={() => salir('nombres')} error={errores.nombres}
            />
            <TextInput
              ref={registrarCampo('apellidos')} label="Apellidos" autoComplete="family-name" required
              value={valores.apellidos} onChange={(e) => cambiar('apellidos', e.currentTarget.value)}
              onBlur={() => salir('apellidos')} error={errores.apellidos}
            />
            <TextInput
              ref={registrarCampo('correo')} label="Correo" type="email" autoComplete="email" required
              value={valores.correo} onChange={(e) => cambiar('correo', e.currentTarget.value)}
              onBlur={() => salir('correo')} error={errores.correo}
            />
            <TextInput
              ref={registrarCampo('celular')} label="Celular" type="tel" inputMode="numeric" autoComplete="tel-national"
              maxLength={9} required leftSection={<Text size="sm" aria-hidden>+51</Text>} leftSectionWidth={44}
              description="Prefijo +51 y 9 dígitos" value={valores.celular}
              onChange={(e) => cambiar('celular', e.currentTarget.value.replace(/\D/g, ''))}
              onBlur={() => salir('celular')} error={errores.celular}
            />
            <PasswordInput
              ref={registrarCampo('contrasena')} label="Contraseña" autoComplete="new-password" required
              value={valores.contrasena} onChange={(e) => cambiar('contrasena', e.currentTarget.value)}
              onBlur={() => salir('contrasena')} error={errores.contrasena}
              aria-describedby="reglas-contrasena"
              visibilityToggleButtonProps={{ 'aria-label': 'Mostrar contraseña' }}
            />
            <div id="reglas-contrasena" aria-live="polite">
              <MedidorPassword politica={politicaRegistro} valor={valores.contrasena} rechazadas={reglasMarcadas} />
            </div>
            <PasswordInput
              ref={registrarCampo('confirmacion')} label="Repite la contraseña" autoComplete="new-password" required
              value={valores.confirmacion} onChange={(e) => cambiar('confirmacion', e.currentTarget.value)}
              onBlur={() => salir('confirmacion')} error={errores.confirmacion}
              visibilityToggleButtonProps={{ 'aria-label': 'Mostrar confirmación' }}
            />
            <Checkbox
              ref={registrarCampo('aceptaTerminos')}
              label="Acepto los términos y condiciones y el tratamiento de mis datos personales conforme a la Ley N.º 29733."
              checked={valores.aceptaTerminos}
              onChange={(e) => cambiar('aceptaTerminos', e.currentTarget.checked)}
              onBlur={() => salir('aceptaTerminos')} error={errores.aceptaTerminos}
            />
            <Button type="submit" color="signal" fullWidth loading={enviando} disabled={enviando}>
              {enviando ? 'Creando tu cuenta…' : 'Crear cuenta'}
            </Button>
            <Anchor component={Link} to="/login" size="sm" ta="center">
              ¿Ya tienes cuenta? Inicia sesión
            </Anchor>
          </Stack>
        </form>
      </Paper>
    </Center>
  )
}
