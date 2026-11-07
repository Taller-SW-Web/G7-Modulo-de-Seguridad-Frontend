// FEAT-02 (SPEC-04): dar de baja y reactivar desde el detalle (FRONT-08, textos de FRONT-07).
// Mismo comportamiento que AccionesBloqueo: confirmación, sin doble envío y, si la red falla, se
// consulta el estado antes de volver a actuar (no se repite la mutación).
import { Alert, Button, Group, Modal, Stack, Text } from '@mantine/core'
import { useRef, useState } from 'react'
import type { Api } from '../../shared/api'
import type { Usuario } from '../../shared/tipos'
import { ApiError, mensajeDeError, RedError } from '../../shared/errores'
import { useSesion } from '../../shared/sesion'

type Accion = 'baja' | 'reactivar'

const TEXTOS: Record<Accion, { titulo: string; cuerpo: string; boton: string; hecho: string }> = {
  baja: {
    titulo: 'Dar de baja la cuenta de',
    cuerpo: 'La cuenta quedará inactiva y se cerrarán sus sesiones. No se borra nada: puedes reactivarla después.',
    boton: 'Dar de baja',
    hecho: 'Cuenta dada de baja.',
  },
  reactivar: {
    titulo: 'Reactivar la cuenta de',
    cuerpo: 'Volverá a estar activa con los mismos datos y roles. Tendrá que iniciar sesión de nuevo.',
    boton: 'Reactivar',
    hecho: 'Cuenta reactivada.',
  },
}

export function AccionesBaja({ api, usuario, onActualizado }: { api: Api; usuario: Usuario; onActualizado: () => void }) {
  const { estado, tienePermiso } = useSesion()
  const [accion, setAccion] = useState<Accion | null>(null)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [ocupada, setOcupada] = useState(false)
  const [incierta, setIncierta] = useState(false)
  const enVuelo = useRef(false)
  const propia = estado.tipo === 'activa' && estado.usuario.id === usuario.id
  // FRONT-07: «Dar de baja» en todo estado salvo INACTIVO y nunca en la propia cuenta; «Reactivar» solo en INACTIVO.
  const puedeBaja = tienePermiso('usuario.desactivar') && !propia && usuario.estado !== 'INACTIVO'
  const puedeReactivar = tienePermiso('usuario.reactivar') && usuario.estado === 'INACTIVO'

  function abrir(tipo: Accion) { setAccion(tipo); setError(''); setAviso('') }
  function cerrar() { if (!enVuelo.current) { setAccion(null); setError('') } }
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
    enVuelo.current = true; setOcupada(true); setError('')
    try {
      if (accion === 'baja') await api.darDeBajaUsuario(usuario.id)
      else await api.reactivarUsuario(usuario.id)
      setAviso(TEXTOS[accion].hecho); setAccion(null); onActualizado()
    } catch (e) {
      if (e instanceof RedError) {
        setAccion(null); setIncierta(true); setAviso('Resultado no confirmado. Consulta el estado antes de volver a actuar.')
      } else if (e instanceof ApiError && e.code === 'ADMINISTRADOR_PROTEGIDO') {
        setError('No puedes hacer esto con tu propia cuenta ni con el último administrador del sistema activo.')
      } else setError(mensajeDeError(e))
    } finally { enVuelo.current = false; setOcupada(false) }
  }

  if (!puedeBaja && !puedeReactivar && !aviso && !incierta) return null
  const textos = accion ? TEXTOS[accion] : null
  return <Stack>
    {aviso && <Alert role="status">{aviso}</Alert>}
    {incierta ? <Button disabled={ocupada} loading={ocupada} onClick={() => void consultar()}>Consultar estado</Button> : <Group>
      {puedeBaja && <Button color="red" variant="outline" onClick={() => abrir('baja')}>Dar de baja</Button>}
      {puedeReactivar && <Button onClick={() => abrir('reactivar')}>Reactivar</Button>}
    </Group>}
    <Modal opened={accion !== null} onClose={cerrar} closeOnEscape={!ocupada} closeOnClickOutside={!ocupada}
      closeButtonProps={{ disabled: ocupada }} title={textos ? `${textos.titulo} ${usuario.correo}` : ''}>
      <Stack>
        <Text>{textos?.cuerpo}</Text>
        {error && <Alert role="alert" color="red">{error}</Alert>}
        <Group><Button color={accion === 'baja' ? 'red' : undefined} loading={ocupada} disabled={ocupada}
          onClick={() => void confirmar()}>{textos?.boton}</Button>
          <Button variant="default" disabled={ocupada} onClick={cerrar}>Cancelar</Button></Group>
      </Stack>
    </Modal>
  </Stack>
}
