export const MENSAJE_FRANJA = 'Sin conexión. Los cambios no se pueden guardar.'

export const MENSAJE_FALLO_RED = 'Sin conexión. Revisa tu internet e inténtalo de nuevo.'

/** `undefined` cuenta como en línea: en el servidor no hay navegador. */
export function estaEnLinea(enLinea: boolean | undefined): boolean {
  return enLinea !== false
}
