export const ORIGEN_CANASTA = 'canasta'

export type EstadoCanasta = { abierta: string }

export function rutaAbonoDesdeCanasta(clienteId: string): string {
  return `/abonos?cliente=${encodeURIComponent(clienteId)}&desde=${ORIGEN_CANASTA}`
}

export function vieneDeCanasta(pathname: string, busqueda: URLSearchParams): boolean {
  return pathname === '/abonos' && busqueda.get('desde') === ORIGEN_CANASTA
}

export function destinoVolver(pathname: string, busqueda: URLSearchParams): string {
  if (vieneDeCanasta(pathname, busqueda)) return '/canasta'
  if (!pathname.startsWith('/compartir')) return '/'
  if (busqueda.get('venta') != null || busqueda.get('desde') === 'venta') return '/venta'
  return '/canasta'
}

export function estadoCanastaAbierta(clienteId: string | null): EstadoCanasta | undefined {
  if (!clienteId) return undefined
  return { abierta: clienteId }
}

export function canastaAbiertaDesdeEstado(state: unknown): string | null {
  if (!state || typeof state !== 'object' || !('abierta' in state)) return null
  const abierta = (state as { abierta?: unknown }).abierta
  return typeof abierta === 'string' && abierta.length > 0 ? abierta : null
}
