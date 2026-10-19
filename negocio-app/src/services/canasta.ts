import type { SupabaseClient } from '@supabase/supabase-js'
import { redondear2 } from '../lib/dinero.ts'
import { agruparPorPrecio, fechaDiaLocal, puedeVender, type ItemCanasta } from '../lib/reglas.ts'
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
 * La fecha de cada venta queda en created_at; no hay historial aparte hasta el envío.
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

/**
 * Modifica, quita o añade prendas de un pedido en una fecha específica.
 * Si itemsNuevos está vacío, se eliminan todas las prendas de esa fecha.
 * Si la canasta del cliente queda totalmente vacía y no tiene saldo a favor,
 * pasa a inactivo según las reglas de negocio.
 */
export async function editarPedidoFecha(
  clienteId: string,
  fecha: string,
  itemsNuevos: ItemCanasta[],
): Promise<Resultado<ItemCanasta[]>> {
  const db = preparar()
  if (esFallo(db)) return db
  if (!clienteId.trim()) return { ok: false, mensaje: 'No se encontró el cliente.' }

  const fechaLimpia = fecha.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaLimpia)) {
    return { ok: false, mensaje: 'Fecha de pedido no válida.' }
  }

  const preparados =
    itemsNuevos.length > 0
      ? prepararItemsCanasta(itemsNuevos)
      : { ok: true as const, datos: [] as ItemCanasta[] }
  if (!preparados.ok) return preparados

  const agrupados = agruparPorPrecio(preparados.datos)

  try {
    const cliente = await obtenerCliente(clienteId)
    if (!cliente.ok) return cliente

    // 1. Cargar las filas actuales de este cliente con su fecha
    const { data, error } = await db
      .from('canasta_items')
      .select('id, precio, cantidad, created_at')
      .eq('cliente_id', clienteId)

    if (error) return { ok: false, mensaje: mensajeErrorCanasta(error, 'cargar el pedido') }

    const filas = Array.isArray(data) ? (data as Array<{ id: string; created_at: string }>) : []
    const itemsDeFecha = filas.filter((fila) => {
      if (typeof fila.created_at !== 'string') return false
      return fechaDiaLocal(fila.created_at) === fechaLimpia
    })

    const idsParaBorrar = itemsDeFecha.map((f) => f.id)
    const fechaOriginal = itemsDeFecha[0]?.created_at ?? `${fechaLimpia}T12:00:00-05:00`

    // 2. Si había items en esa fecha, borrarlos
    if (idsParaBorrar.length > 0) {
      const { error: errorDelete } = await db
        .from('canasta_items')
        .delete()
        .in('id', idsParaBorrar)

      if (errorDelete) {
        return { ok: false, mensaje: mensajeErrorCanasta(errorDelete, 'actualizar el pedido') }
      }
    }

    // 3. Insertar las prendas nuevas/modificadas conservando la fecha original
    if (agrupados.length > 0) {
      const nuevasFilas = agrupados.map((item) => ({
        cliente_id: clienteId,
        precio: item.precio,
        cantidad: item.cantidad,
        created_at: fechaOriginal,
      }))

      const { error: errorInsert } = await db.from('canasta_items').insert(nuevasFilas)
      if (errorInsert) {
        return { ok: false, mensaje: mensajeErrorCanasta(errorInsert, 'guardar prendas actualizadas') }
      }
    }

    // 4. Si la canasta quedó totalmente vacía y no tiene saldo a favor, pasa a inactivo
    const itemsOtrasFechas = filas.filter((f) => !idsParaBorrar.includes(f.id))
    const canastaVacia = itemsOtrasFechas.length === 0 && agrupados.length === 0

    if (canastaVacia && cliente.datos.saldo_favor <= 0 && cliente.datos.estado === 'activo') {
      await db.from('clientes').update({ estado: 'inactivo' }).eq('id', clienteId)
    }

    return {
      ok: true,
      datos: agrupados.map((g) => ({ precio: g.precio, cantidad: g.cantidad })),
    }
  } catch (error) {
    return { ok: false, mensaje: mensajeErrorCanasta(error, 'actualizar el pedido') }
  }
}

/** Borra todas las prendas de un día de compra. */
export async function borrarPedidoFecha(
  clienteId: string,
  fecha: string,
): Promise<Resultado<ItemCanasta[]>> {
  return editarPedidoFecha(clienteId, fecha, [])
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
