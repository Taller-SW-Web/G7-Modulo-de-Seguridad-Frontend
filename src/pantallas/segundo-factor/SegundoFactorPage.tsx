import { Alert, Button, Container, Group, Modal, Paper, PinInput, Stack, Text, Title } from '@mantine/core'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Api } from '../../shared/api'
import { ApiError, RedError, mensajeDeError } from '../../shared/errores'
import { useSesion } from '../../shared/sesion'
import type { CambioMfaEnviado, Usuario } from '../../shared/tipos'

type Operacion = CambioMfaEnviado & { codigoHasta: number; cambioHasta: number }
const MENSAJE: Record<string, string> = {
  VALIDACION: 'Revisa los datos o actualiza el estado del segundo factor.',
  CODIGO_INVALIDO: 'El código no es correcto. Revisa los seis dígitos.',
  OTP_INTENTOS_AGOTADOS: 'Agotaste los intentos; solicita otro código.',
  OTP_EXPIRADO: 'El código venció; solicita otro.',
  MFA_OBLIGATORIO: 'Tu rol exige el segundo factor; no puedes desactivarlo.',
  DEMASIADAS_SOLICITUDES: 'Espera el tiempo indicado antes de pedir otro código.',
  TOKEN_NO_APLICABLE: 'No se pudo autorizar esta operación.',
}

/** FRONT-09: operación exclusivamente en memoria, independiente del desafío de login. */
export function SegundoFactorPage({ api }: { api: Api }) {
  const { terminarSesion } = useSesion()
  const [perfil, setPerfil] = useState<Usuario | null>(null)
  const [operacion, setOperacion] = useState<Operacion | null>(null)
  const [codigo, setCodigo] = useState('')
  const [consentir, setConsentir] = useState(false)
  const [ocupada, setOcupada] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [ahora, setAhora] = useState(Date.now)
  const [reenvioEn, setReenvioEn] = useState(0)
  const [agotado, setAgotado] = useState(false)
  const [incierta, setIncierta] = useState(false)
  const enVuelo = useRef(false)
  const generacion = useRef(0)
  const invalidar = useCallback(() => { generacion.current++ }, [])
  const obligatorio = perfil?.roles.some((r) => r !== 'CLIENTE' && r !== 'VENDEDOR') ?? false

  const cargar = useCallback(async () => {
    const version = generacion.current
    try {
      const p = await api.perfilPropio()
      if (version === generacion.current) { setPerfil(p); setIncierta(false) }
    } catch (e) { if (version === generacion.current) setError(mensajeDeError(e)) }
  }, [api])

  useEffect(() => {
    void cargar()
    const reloj = setInterval(() => setAhora(Date.now()), 1000)
    return () => { clearInterval(reloj); invalidar() }
  }, [cargar, invalidar])

  function limpiar() {
    generacion.current++
    setOperacion(null); setConsentir(false); setCodigo(''); setAgotado(false); setError('')
  }

  useEffect(() => {
    if (operacion && ahora >= operacion.cambioHasta) {
      setOperacion(null); setCodigo(''); setAviso('El cambio venció. Inicia una nueva solicitud.')
    }
  }, [ahora, operacion])

  async function ejecutar(tipo: 'solicitar' | 'reenviar' | 'confirmar') {
    if (enVuelo.current || incierta) return
    enVuelo.current = true; setOcupada(true); setError(''); setAviso('')
    const version = generacion.current
    try {
      if (tipo === 'confirmar') {
        if (!operacion || !/^[0-9]{6}$/.test(codigo)) return
        await api.mfaConfirmar(operacion.mfaChangeToken, codigo)
        if (version !== generacion.current) return
        setOperacion(null); setCodigo(''); setAviso('Cambio confirmado.')
        setIncierta(true) // La nueva lectura del perfil es la fuente del estado efectivo.
        await cargar()
      } else {
        const respuesta = tipo === 'reenviar' && operacion
          ? await api.mfaReenviar(operacion.mfaChangeToken)
          : await api.mfaSolicitar(perfil?.mfaHabilitado ? 'DESHABILITAR' : 'HABILITAR')
        if (version !== generacion.current) return
        const recibido = Date.now()
        setOperacion({ ...respuesta, codigoHasta: recibido + respuesta.expiraEn * 1000,
          cambioHasta: Math.min(operacion?.cambioHasta ?? Infinity, recibido + respuesta.cambioExpiraEn * 1000) })
        setCodigo(''); setAgotado(false); setConsentir(false); setAhora(recibido)
      }
    } catch (e) {
      if (version !== generacion.current) return
      if (e instanceof ApiError && e.code === 'TOKEN_INVALIDO') {
        limpiar(); terminarSesion('vencida'); return
      }
      setError(e instanceof ApiError ? (MENSAJE[e.code ?? ''] ?? mensajeDeError(e)) : mensajeDeError(e))
      if (e instanceof ApiError && e.code === 'CODIGO_INVALIDO' && e.problem.intentosRestantes !== undefined)
        setError(`${MENSAJE.CODIGO_INVALIDO} Te quedan ${e.problem.intentosRestantes} intentos.`)
      if (e instanceof ApiError && e.code === 'OTP_INTENTOS_AGOTADOS') setAgotado(true)
      if (e instanceof ApiError && e.code === 'DEMASIADAS_SOLICITUDES') setReenvioEn(Date.now() + (e.retryAfter ?? 1) * 1000)
      if (e instanceof ApiError && e.code === 'MFA_OBLIGATORIO') { limpiar(); await cargar() }
      if (tipo === 'confirmar' && e instanceof RedError) {
        limpiar(); setIncierta(true)
        setAviso('El resultado no está confirmado. Consulta el estado antes de iniciar otra operación.')
      }
    } finally {
      enVuelo.current = false; setOcupada(false)
    }
  }

  const cambioVigente = operacion !== null && ahora < operacion.cambioHasta
  const codigoVigente = cambioVigente && ahora < operacion.codigoHasta && !agotado
  const restante = operacion ? Math.max(0, Math.ceil((Math.min(operacion.codigoHasta, operacion.cambioHasta) - ahora) / 1000)) : 0
  return (
    <Container size="sm" py="lg">
      <Stack gap="md">
        <Title order={1} size="h2">Segundo factor</Title>
        {error && !consentir && !operacion && <Alert color="red" role="alert">{error}</Alert>}
        {aviso && <Alert role="status">{aviso}</Alert>}
        <Paper withBorder p="lg" radius="md">
          <Stack>
            <Text>{!perfil ? 'Cargando tu perfil…' : obligatorio ? 'Activo, obligatorio para tu rol.' : perfil.mfaHabilitado ? 'Segundo factor activo.' : 'Segundo factor desactivado.'}</Text>
            <Text size="sm">Confirma el cambio con un código enviado a tu correo.</Text>
            {perfil && !obligatorio && <Button disabled={ocupada || incierta || ahora < reenvioEn || !!operacion}
              onClick={() => perfil.mfaHabilitado ? setConsentir(true) : void ejecutar('solicitar')}>
              {perfil.mfaHabilitado ? 'Desactivar' : 'Activar'}
            </Button>}
            {(!perfil || incierta) && <Button variant="light" disabled={ocupada} onClick={() => void cargar()}>Consultar estado</Button>}
          </Stack>
        </Paper>
        <Modal opened={consentir || operacion !== null} onClose={() => { if (!enVuelo.current) limpiar() }}
          closeOnClickOutside={!ocupada} closeOnEscape={!ocupada} closeButtonProps={{ disabled: ocupada }}
          title={consentir ? 'Desactivar segundo factor' : 'Confirma el cambio'}>
          <Stack>
            {error && <Alert color="red" role="alert">{error}</Alert>}
            {consentir ? <>
              <Text>En tu próximo inicio de sesión no se pedirá un código. Confirma esta decisión mediante el código de correo.</Text>
              <Button loading={ocupada} disabled={ocupada || ahora < reenvioEn} onClick={() => void ejecutar('solicitar')}>Continuar</Button>
            </> : <>
              <Text>Enviamos el código a {operacion?.destinoEnmascarado}.</Text>
              <Text size="sm" aria-live="off">Código y cambio: {restante} s restantes.</Text>
              {cambioVigente && !codigoVigente && !agotado && <Text>El código venció; solicita otro.</Text>}
              <Group justify="center" aria-label="Código de seis dígitos">
                <PinInput length={6} type="number" oneTimeCode value={codigo} onChange={setCodigo}
                  disabled={ocupada || !codigoVigente} autoFocus getInputProps={(i) => ({ 'aria-label': `Dígito ${i + 1} de 6` })} />
              </Group>
              <Button loading={ocupada} disabled={ocupada || !codigoVigente || codigo.length !== 6} onClick={() => void ejecutar('confirmar')}>Confirmar</Button>
              <Button variant="light" disabled={ocupada || !cambioVigente || ahora < reenvioEn} onClick={() => void ejecutar('reenviar')}>Reenviar código</Button>
            </>}
            {ahora < reenvioEn && <Text role="status">Espera {Math.ceil((reenvioEn - ahora) / 1000)} s antes de pedir otro código.</Text>}
            <Button variant="subtle" disabled={ocupada} onClick={limpiar}>Cancelar</Button>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  )
}
