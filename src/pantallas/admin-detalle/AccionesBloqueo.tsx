import { Alert, Button, Group, Modal, Stack, Text, Textarea } from '@mantine/core'
import { useRef, useState } from 'react'
import type { Api } from '../../shared/api'
import type { Usuario } from '../../shared/tipos'
import { ApiError, mensajeDeError, RedError } from '../../shared/errores'
import { useSesion } from '../../shared/sesion'

export function AccionesBloqueo({ api, usuario, onActualizado }: { api: Api; usuario: Usuario; onActualizado: () => void }) {
  const { estado, tienePermiso } = useSesion()
  const [accion, setAccion] = useState<'bloquear' | 'desbloquear' | null>(null)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [ocupada, setOcupada] = useState(false)
  const [incierta, setIncierta] = useState(false)
  const enVuelo = useRef(false)
  const propia = estado.tipo === 'activa' && estado.usuario.id === usuario.id
  const puedeBloquear = !propia && (usuario.estado === 'ACTIVO' || (usuario.estado === 'BLOQUEADO' && usuario.bloqueo?.tipo === 'AUTOMATICO'))
  function abrir(tipo: 'bloquear' | 'desbloquear') { setAccion(tipo); setMotivo(''); setError(''); setAviso('') }
  function cerrar() { if (!enVuelo.current) { setAccion(null); setMotivo(''); setError('') } }
  async function consultar() {
    if (enVuelo.current) return
    enVuelo.current = true; setOcupada(true)
    try {
      await api.obtenerUsuario(usuario.id)
      onActualizado(); setIncierta(false); setAviso('Estado consultado.')
    } catch { setAviso('No se pudo confirmar el estado. Intenta consultar nuevamente.') }
    finally { enVuelo.current = false; setOcupada(false) }
  }
  async function confirmar() {
    if (!accion || enVuelo.current) return
    if (accion === 'bloquear' && (!motivo.trim() || motivo.length > 500)) {
      setError(!motivo.trim() ? 'Escribe el motivo del bloqueo.' : 'El motivo no puede superar los 500 caracteres.'); return
    }
    enVuelo.current = true; setOcupada(true); setError('')
    try {
      if (accion === 'bloquear') await api.bloquearUsuario(usuario.id, motivo.trim())
      else await api.desbloquearUsuario(usuario.id)
      setAviso(accion === 'bloquear' ? 'Cuenta bloqueada.' : 'Cuenta desbloqueada.')
      setAccion(null); setMotivo(''); onActualizado()
    } catch (e) {
      if (e instanceof RedError) {
        setAccion(null); setIncierta(true); setAviso('Resultado no confirmado. Consulta el estado antes de volver a actuar.')
      } else if (e instanceof ApiError && e.code === 'ADMINISTRADOR_PROTEGIDO') {
        setError('No puedes hacer esto con tu propia cuenta ni con el último administrador del sistema activo.')
      } else if (e instanceof ApiError && e.code === 'CUENTA_NO_DISPONIBLE') {
        setError('Esta cuenta no se puede bloquear en su estado actual.'); onActualizado()
      } else setError(mensajeDeError(e))
    } finally { enVuelo.current = false; setOcupada(false) }
  }
  if (!tienePermiso('cuenta.bloquear')) return null
  return <Stack>
    {aviso && <Alert role="status">{aviso}</Alert>}
    {incierta ? <Button disabled={ocupada} loading={ocupada} onClick={() => void consultar()}>Consultar estado</Button> : <Group>
      {puedeBloquear && <Button color="red" onClick={() => abrir('bloquear')}>{usuario.estado === 'BLOQUEADO' ? 'Bloquear manualmente' : 'Bloquear'}</Button>}
      {usuario.estado === 'BLOQUEADO' && <Button onClick={() => abrir('desbloquear')}>Desbloquear</Button>}
    </Group>}
    <Modal opened={accion !== null} onClose={cerrar} closeOnEscape={!ocupada} closeOnClickOutside={!ocupada}
      closeButtonProps={{ disabled: ocupada }} title={`${accion === 'bloquear' ? 'Bloquear' : 'Desbloquear'} la cuenta de ${usuario.correo}`}>
      <Stack>
        <Text>{accion === 'bloquear' ? 'Se cerrarán todas sus sesiones y no podrá entrar hasta que un administrador la desbloquee. Le avisaremos por correo, sin incluir el motivo.' : 'Podrá volver a iniciar sesión. Le avisaremos por correo.'}</Text>
        {accion === 'bloquear' && <Textarea label="Motivo (obligatorio)" value={motivo} onChange={(e) => setMotivo(e.currentTarget.value)}
          description={`${motivo.length}/500. Solo lo ven los administradores.`} error={error || undefined} disabled={ocupada} />}
        {accion !== 'bloquear' && error && <Alert role="alert" color="red">{error}</Alert>}
        <Group><Button loading={ocupada} disabled={ocupada} onClick={() => void confirmar()}>Confirmar</Button>
          <Button variant="default" disabled={ocupada} onClick={cerrar}>Cancelar</Button></Group>
      </Stack>
    </Modal>
  </Stack>
}
