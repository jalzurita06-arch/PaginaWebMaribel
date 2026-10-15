import { mismaSeccion } from '../config/secciones.ts'

export const MS_CUBRIR = 420
export const MS_REVELAR = 320

/** Si la animación no termina, igual se suelta la pantalla. */
export const MS_TOPE_CUBRIR = 900

export function destinoDeSalto(actual: string, ruta: string): string | null {
  if (mismaSeccion(actual, ruta)) return null
  return ruta
}
