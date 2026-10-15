import { redondear2 } from './dinero.ts'
import type { ItemCanasta } from './reglas.ts'

const CLAVE = 'negocio.ventaConfirmada'

export type MenuVentaConfirmada = {
  clienteId: string
  venta: ItemCanasta[]
}

export function guardarMenuVenta(clienteId: string, venta: ItemCanasta[]): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(CLAVE, JSON.stringify({ clienteId, venta }))
}

export function borrarMenuVenta(): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem(CLAVE)
}

export function leerMenuVenta(): MenuVentaConfirmada | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const crudo = sessionStorage.getItem(CLAVE)
    if (!crudo) return null
    const datos = JSON.parse(crudo) as { clienteId?: unknown; venta?: unknown }
    if (typeof datos.clienteId !== 'string' || !datos.clienteId) return null
    const venta = leerItems(datos.venta)
    if (!venta) return null
    return { clienteId: datos.clienteId, venta }
  } catch {
    return null
  }
}

function leerItems(valor: unknown): ItemCanasta[] | null {
  if (!Array.isArray(valor) || valor.length === 0) return null
  const items: ItemCanasta[] = []
  for (const fila of valor) {
    if (typeof fila !== 'object' || fila === null) return null
    const precio = Number((fila as { precio?: unknown }).precio)
    const cantidad = Number((fila as { cantidad?: unknown }).cantidad)
    if (!Number.isFinite(precio) || !Number.isInteger(cantidad) || cantidad <= 0) return null
    items.push({ precio: redondear2(precio), cantidad })
  }
  return items
}
