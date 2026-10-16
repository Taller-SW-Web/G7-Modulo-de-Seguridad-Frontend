// Desafío MFA del login (FRONT-04): solo en memoria, nunca en la URL ni en almacenamiento.
import type { DesafioMfa } from './tipos'

export interface DesafioEnCurso {
  challengeToken: string
  /** Vencimiento absoluto del desafío (ms epoch); el reenvío nunca lo prorroga. */
  venceEn: number
}

let actual: DesafioEnCurso | null = null

export function guardarDesafio(desafio: DesafioMfa, ahora = Date.now()): void {
  actual = { challengeToken: desafio.challengeToken, venceEn: ahora + desafio.expiraEn * 1000 }
}

export function desafioActual(ahora = Date.now()): DesafioEnCurso | null {
  if (actual && actual.venceEn <= ahora) actual = null
  return actual
}

export function descartarDesafio(): void {
  actual = null
}
