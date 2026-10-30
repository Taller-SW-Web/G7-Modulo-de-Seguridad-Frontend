// Tipos del contrato OpenAPI de G7 (specs/contrato-api/openapi.yaml) que usa la SPA.

export type CodigoRol =
  | 'CLIENTE'
  | 'VENDEDOR'
  | 'ADMIN_VENTAS'
  | 'GESTOR_DESPACHO'
  | 'GESTOR_COMERCIAL'
  | 'ADMIN_SISTEMA'

export const CODIGOS_ROL: readonly CodigoRol[] = [
  'CLIENTE',
  'VENDEDOR',
  'ADMIN_VENTAS',
  'GESTOR_DESPACHO',
  'GESTOR_COMERCIAL',
  'ADMIN_SISTEMA',
]

export type EstadoCuenta = 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO' | 'PENDIENTE_VERIFICACION'

export const ESTADOS_CUENTA: readonly EstadoCuenta[] = [
  'ACTIVO',
  'INACTIVO',
  'BLOQUEADO',
  'PENDIENTE_VERIFICACION',
]

/** Error RFC 7807. Se ramifica por `code`, nunca por `detail`. */
export interface Problem {
  type?: string
  title?: string
  status?: number
  code?: string
  detail?: string
  instance?: string
  errores?: { campo?: string; mensaje?: string; regla?: string; esperado?: unknown }[]
  intentosRestantes?: number
}

export interface UsuarioSesion {
  id: string
  nombreCompleto: string
  correo: string
  roles: CodigoRol[]
}

export interface SesionIniciada {
  accessToken: string
  refreshToken: string
  tokenType: 'Bearer'
  expiresIn: number
  usuario: UsuarioSesion
}

export interface DesafioMfa {
  mfaRequerido: true
  challengeToken: string
  expiraEn: number
  canal?: 'EMAIL' | 'SMS'
}

export interface OtpEnviado {
  canal: 'EMAIL' | 'SMS'
  destinoEnmascarado: string
  /** Segundos de validez del código. */
  expiraEn: number
  /** Segundos restantes del desafío; el reenvío no lo prorroga. */
  desafioExpiraEn?: number
}

export interface CambioMfaEnviado {
  mfaChangeToken: string
  canal: 'EMAIL'
  destinoEnmascarado: string
  expiraEn: number
  cambioExpiraEn: number
}

export interface Bloqueo {
  tipo: 'AUTOMATICO' | 'MANUAL'
  hasta: string | null
  motivo?: string
}

export interface Usuario {
  id: string
  nombres?: string
  apellidos?: string
  nombreCompleto: string
  correo: string
  celular?: string
  estado: EstadoCuenta
  correoVerificado?: boolean
  celularVerificado?: boolean
  mfaHabilitado?: boolean
  roles: CodigoRol[]
  tipoDocumento?: 'DNI' | 'CE' | 'PASAPORTE'
  documentoEnmascarado?: string
  /** Atributos de rol: el backend los envía solo si el rol aplica (null = aún sin registrar). */
  fechaNacimiento?: string | null
  codigoVendedor?: string | null
  tienda?: string | null
  fechaIngreso?: string | null
  bloqueo?: Bloqueo | null
}

export interface PaginaUsuarios {
  usuarios: Usuario[]
  pagina: number
  tamano: number
  total: number
}

export interface PoliticaPassword {
  longitudMinima: number
  requiereMayuscula: boolean
  requiereMinuscula: boolean
  requiereDigito: boolean
  requiereCaracterEspecial: boolean
  rechazaComunes?: boolean
  rechazaDatosPersonales?: boolean
  historial?: number
  caducidadDiasAdmin?: number
}

export function esDesafioMfa(respuesta: SesionIniciada | DesafioMfa): respuesta is DesafioMfa {
  return (respuesta as DesafioMfa).mfaRequerido === true
}

export interface RegistroActividad {
  id: string
  fecha: string
  accion: string
  resultado: 'EXITO' | 'FALLO'
  actorTipo: 'USUARIO' | 'MODULO' | 'SISTEMA'
  actorId?: string | null
  objetivoUsuarioId?: string | null
  ip?: string | null
  agente?: string | null
}

export interface PaginaActividad {
  registros: RegistroActividad[]
  pagina: number
  tamano: number
  total: number
}
