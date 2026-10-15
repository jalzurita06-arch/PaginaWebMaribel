import type { SupabaseClient } from '@supabase/supabase-js'
import { redondear2 } from '../lib/dinero.ts'
import { puedeVender, type ItemCanasta } from '../lib/reglas.ts'
import { supabase } from '../lib/supabase.ts'
import { obtenerCliente, type Resultado } from './clientes.ts'

export type FilaCanasta = ItemCanasta & { id: string }

export const MENSAJE_CLIENTE_INACTIVO =
  'Esta clienta necesita un abono de $5 o una canasta activa antes de comprar'

const MENSAJE_SIN_CONEXION = 'Sin conexión. Revisa tu internet e inténtalo de nuevo.'
const MENSAJE_CONFIG = 'Faltan los datos de conexión. Revisa la configuración de la app.'
const MENSAJE_ITEMS = 'La cantidad debe ser un entero mayor que 0.'
const MENSAJE_PRECIO = 'Cada prenda necesita un precio mayor que 0.'
const MENSAJE_VACIO = 'Agrega al menos una prenda.'

type ErrorDatos = { code?: string; message?: string }

/** Traduce un error de la base a un mensaje que se puede mostrar. */
export function mensajeErrorCanasta(error: unknown, accion: string): string {
  const datos = leerError(error)
  const texto = (datos.message ?? '').toLowerCase()

  if (
    texto.includes('failed to fetch') ||
    texto.includes('fetch failed') ||
    texto.includes('networkerror') ||
    texto.includes('network request failed') ||
    texto.includes('load failed')
  ) {
    return MENSAJE_SIN_CONEXION
  }

  if (datos.code === '42501' || datos.code === 'PGRST301') {
    return 'La sesión expiró. Vuelve a entrar.'
  }

  return `No se pudo ${accion}. Inténtalo de nuevo.`
}

/** Deja solo dígitos de un entero positivo. Quita decimales, signos y ceros a la izquierda. */
export function textoCantidadEntera(texto: string): string {
  const parteEntera = texto.trim().replace(',', '.').split('.')[0] ?? ''
  return parteEntera.replace(/\D/g, '').replace(/^0+/, '')
}

/** null si el texto no es un entero mayor que 0. */
export function leerCantidadEntera(texto: string): number | null {
  const limpio = texto.trim()
  if (!/^[1-9]\d*$/.test(limpio)) return null
  const cantidad = Number(limpio)
  if (!Number.isSafeInteger(cantidad) || cantidad <= 0) return null
  return cantidad
}

/** Deja precio y cantidad listos para guardar. No suma totales. */
export function prepararItemsCanasta(items: ItemCanasta[]): Resultado<ItemCanasta[]> {
  if (!Array.isArray(items) || items.length === 0) return { ok: false, mensaje: MENSAJE_VACIO }

  const limpios: ItemCanasta[] = []
  for (const item of items) {
    if (typeof item?.precio !== 'number' || typeof item.cantidad !== 'number') {
      return { ok: false, mensaje: MENSAJE_PRECIO }
    }
    const precio = redondear2(item.precio)
    if (!Number.isFinite(item.precio) || !(precio > 0)) return { ok: false, mensaje: MENSAJE_PRECIO }
    if (!Number.isInteger(item.cantidad) || item.cantidad <= 0) return { ok: false, mensaje: MENSAJE_ITEMS }
    limpios.push({ precio, cantidad: item.cantidad })
  }

  return { ok: true, datos: limpios }
}

export async function obtenerCanasta(clienteId: string): Promise<Resultado<FilaCanasta[]>> {
  const db = preparar()
  if (esFallo(db)) return db
  if (!clienteId.trim()) return { ok: false, mensaje: 'No se encontró el cliente.' }

  try {
    const { data, error } = await db
      .from('canasta_items')
      .select('id, precio, cantidad')
      .eq('cliente_id', clienteId)

    if (error) return { ok: false, mensaje: mensajeErrorCanasta(error, 'cargar la canasta') }
    const filas = leerFilas(data)
    if (!filas) return { ok: false, mensaje: 'No se pudo leer la canasta.' }
    return { ok: true, datos: filas.filter((fila) => fila.cantidad > 0) }
  } catch (error) {
    return { ok: false, mensaje: mensajeErrorCanasta(error, 'cargar la canasta') }
  }
}

/**
 * Copia las líneas a canasta_items.
 * No crea historial: la venta solo existe como prendas de la canasta.
 */
export async function agregarItemsCanasta(
  clienteId: string,
  items: ItemCanasta[],
): Promise<Resultado<ItemCanasta[]>> {
  const db = preparar()
  if (esFallo(db)) return db

  const preparados = prepararItemsCanasta(items)
  if (!preparados.ok) return preparados

  try {
    const cliente = await obtenerCliente(clienteId)
    if (!cliente.ok) return cliente
    if (!puedeVender(cliente.datos.estado)) return { ok: false, mensaje: MENSAJE_CLIENTE_INACTIVO }

    const filas = preparados.datos.map((item) => ({
      cliente_id: clienteId,
      precio: item.precio,
      cantidad: item.cantidad,
    }))

    const { error } = await db.from('canasta_items').insert(filas)
    if (error) return { ok: false, mensaje: mensajeErrorCanasta(error, 'guardar el pedido') }
    return { ok: true, datos: preparados.datos }
  } catch (error) {
    return { ok: false, mensaje: mensajeErrorCanasta(error, 'guardar el pedido') }
  }
}

function preparar(): { ok: false; mensaje: string } | SupabaseClient {
  if (!supabase) return { ok: false, mensaje: MENSAJE_CONFIG }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, mensaje: MENSAJE_SIN_CONEXION }
  }
  return supabase
}

function esFallo(
  valor: { ok: false; mensaje: string } | SupabaseClient,
): valor is { ok: false; mensaje: string } {
  return 'mensaje' in valor
}

function leerFilas(data: unknown): FilaCanasta[] | null {
  if (!Array.isArray(data)) return null
  const filas: FilaCanasta[] = []
  for (const valor of data) {
    if (typeof valor !== 'object' || valor === null) return null
    const fila = valor as Record<string, unknown>
    const precio = Number(fila.precio)
    const cantidad = Number(fila.cantidad)
    if (typeof fila.id !== 'string' || !Number.isFinite(precio) || !Number.isInteger(cantidad)) return null
    filas.push({ id: fila.id, precio: redondear2(precio), cantidad })
  }
  return filas
}

function leerError(error: unknown): ErrorDatos {
  if (typeof error === 'object' && error !== null) {
    const datos = error as ErrorDatos
    return {
      code: typeof datos.code === 'string' ? datos.code : undefined,
      message: typeof datos.message === 'string' ? datos.message : '',
    }
  }
  if (error instanceof Error) return { message: error.message }
  return { message: '' }
}
