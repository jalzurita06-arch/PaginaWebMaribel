export type TonoAviso = 'ok' | 'error'

export type AvisoVisible = {
  texto: string
  tono: TonoAviso
}

/** El aviso en pantalla se queda; la burbuja es refuerzo, no el único aviso. */
export function avisoPersistente(texto: string, tono: TonoAviso): AvisoVisible {
  return { texto, tono }
}

export const DURACION_BURBUJA_MS = 8000
