// FRONT-01: estado del formulario, envío y ramificación de la respuesta del login.
import { useRef, useState } from 'react'
import type { Api } from '../../shared/api'
import { ApiError, mensajeDeError } from '../../shared/errores'
import { esDesafioMfa, type DesafioMfa, type SesionIniciada } from '../../shared/tipos'

export const MENSAJE_CREDENCIALES = 'El correo o la contraseña no son correctos.'

export type ResultadoLogin =
  | { tipo: 'sesion'; sesion: SesionIniciada }
  | { tipo: 'mfa'; desafio: DesafioMfa }
  | { tipo: 'caducada' }
  | { tipo: 'error'; mensaje: string; credenciales: boolean }

export function validarCampos(correo: string, contrasena: string): { correo?: string; contrasena?: string } {
  const errores: { correo?: string; contrasena?: string } = {}
  if (!correo.trim()) errores.correo = 'Escribe tu correo.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim()))
    errores.correo = 'Escribe un correo válido, como nombre@dominio.com.'
  if (!contrasena) errores.contrasena = 'Escribe tu contraseña.'
  return errores
}

export function useLogin(api: Api) {
  const [enviando, setEnviando] = useState(false)
  const enVuelo = useRef(false)

  async function iniciar(correo: string, contrasena: string): Promise<ResultadoLogin> {
    if (enVuelo.current) return { tipo: 'error', mensaje: '', credenciales: false }
    enVuelo.current = true
    setEnviando(true)
    try {
      const respuesta = await api.login(correo.trim(), contrasena)
      return esDesafioMfa(respuesta) ? { tipo: 'mfa', desafio: respuesta } : { tipo: 'sesion', sesion: respuesta }
    } catch (error) {
      // Anti-enumeración: inexistente, bloqueada o inactiva llegan como el mismo 401 (RF-05.4).
      if (error instanceof ApiError && error.code === 'CREDENCIALES_INVALIDAS')
        return { tipo: 'error', mensaje: MENSAJE_CREDENCIALES, credenciales: true }
      if (error instanceof ApiError && error.code === 'PASSWORD_CADUCADA') return { tipo: 'caducada' }
      return { tipo: 'error', mensaje: mensajeDeError(error), credenciales: false }
    } finally {
      enVuelo.current = false
      setEnviando(false)
    }
  }

  return { enviando, iniciar }
}
