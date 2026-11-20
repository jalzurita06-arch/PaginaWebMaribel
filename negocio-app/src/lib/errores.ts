export const MENSAJE_SIN_CONEXION = 'Sin conexión. Revisa tu internet e inténtalo de nuevo.'
export const MENSAJE_SESION_VENCIDA = 'La sesión expiró. Vuelve a entrar.'
export const MENSAJE_DESCARGA_PDF = 'No se pudo descargar el PDF. Inténtalo de nuevo.'
export const MENSAJE_DESCARGA_EXCEL = 'No se pudo descargar el Excel. Inténtalo de nuevo.'
export const MENSAJE_IMAGEN_PEDIDO = 'No se pudo crear la imagen del pedido. Inténtalo de nuevo.'

export function esMensajeDeRed(mensaje: string): boolean {
  const texto = mensaje.toLowerCase()
  return (
    texto.includes('failed to fetch') ||
    texto.includes('fetch failed') ||
    texto.includes('networkerror') ||
    texto.includes('network request failed') ||
    texto.includes('load failed')
  )
}

/** Nunca muestra el texto crudo de red, PDF o el navegador. */
export function mensajeErrorHumano(error: unknown, fallback: string): string {
  if (error instanceof Error && esMensajeDeRed(error.message)) return MENSAJE_SIN_CONEXION
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const texto = error.message
    if (typeof texto === 'string' && esMensajeDeRed(texto)) return MENSAJE_SIN_CONEXION
  }
  return fallback
}

export function mensajeErrorDescarga(formato: 'pdf' | 'excel'): string {
  return formato === 'excel' ? MENSAJE_DESCARGA_EXCEL : MENSAJE_DESCARGA_PDF
}
