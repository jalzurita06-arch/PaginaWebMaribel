import type { SupabaseClient } from '@supabase/supabase-js'
import { formatearDolares, redondear2 } from '../lib/dinero.ts'
import {
  agruparPorPrecio,
  calcularEnvio,
  ordenarPorCanasta,
  saldoPendiente,
  totalCanasta,
  totalPrendas,
  type GrupoPrecio,
  type ItemCanasta,
} from '../lib/reglas.ts'
import { supabase } from '../lib/supabase.ts'
import type { EstadoCliente, Resultado } from './clientes.ts'

export const MENSAJE_CANASTA_VACIA = 'La canasta está vacía. No hay nada que enviar.'

const MENSAJE_SIN_CONEXION = 'Sin conexión. Revisa tu internet e inténtalo de nuevo.'
const MENSAJE_CONFIG = 'Faltan los datos de conexión. Revisa la configuración de la app.'
const MENSAJE_NO_ENCONTRADO = 'No se encontró el cliente.'
const MENSAJE_CAMBIO =
  'La canasta cambió mientras se enviaba. Inténtalo de nuevo.'
const MENSAJE_RECUPERAR =
  'El envío no se guardó y no se pudo dejar la canasta como estaba. Revisa a la clienta antes de intentar de nuevo.'
const MENSAJE_SALDO_SIN_ENVIO =
  'El saldo cambió, pero la canasta no se envió. Revisa a la clienta antes de intentar de nuevo.'

export const TIPOS_ENVIO = ['local', 'uber', 'servientrega'] as const
export type TipoEnvio = (typeof TIPOS_ENVIO)[number]

export type CanastaAbierta = {
  clienteId: string
  codigo: string
  nombre: string | null
  telefono: string
  saldoFavor: number
  prendas: number
  total: number
  saldo: number
  grupos: GrupoPrecio[]
}

export type EnvioSemana = {
  id: string
  fecha: string
  codigo: string
  tipo: string
  prendas: number
  total: number
  detalle: GrupoPrecio[]
}

export type EnvioRegistrado = {
  envio: EnvioSemana
  nuevoSaldoFavor: number
  nuevoEstado: EstadoCliente
}

type ErrorDatos = { code?: string; message?: string }

type FilaAgrupable = {
  clienteId: string
  codigo: string
  nombre: string | null
  telefono: string
  saldoFavor: number
  precio: number
  cantidad: number
}

type ItemGuardado = { id: string; precio: number; cantidad: number }

type ClienteEnvio = {
  id: string
  codigo: string
  estado: EstadoCliente
  saldoCrudo: number | string
  saldoFavor: number
  items: ItemGuardado[]
}

/** Traduce un error de la base a un mensaje que se puede mostrar. */
export function mensajeErrorEnvio(error: unknown, accion: string): string {
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

export function esTipoEnvio(valor: string): valor is TipoEnvio {
  return (TIPOS_ENVIO as readonly string[]).includes(valor)
}

/**
 * El historial guarda 7 días. La fecha de corte es hoy menos 7:
 * ese día se conserva y lo anterior ya tiene más de 7 días.
 */
export function fechaCorteEnvios(ahora: Date): string {
  const corte = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 7)
  const mes = String(corte.getMonth() + 1).padStart(2, '0')
  const dia = String(corte.getDate()).padStart(2, '0')
  return `${corte.getFullYear()}-${mes}-${dia}`
}

export function envioEsAntiguo(fecha: string, ahora: Date): boolean {
  return fecha.slice(0, 10) < fechaCorteEnvios(ahora)
}

export function mensajeEnvioConfirmado(nuevoSaldoFavor: number): string {
  const saldo = redondear2(Math.max(0, nuevoSaldoFavor))
  if (saldo > 0) {
    return `Enviado. Queda ${formatearDolares(saldo)} a favor para su próxima compra.`
  }
  return 'Enviado. La clienta queda inactiva.'
}

/** Calcula saldo, estado y detalle. No toca la base. */
export function armarRegistroEnvio(
  items: ItemCanasta[],
  saldoFavor: number,
): Resultado<{
  nuevoSaldoFavor: number
  nuevoEstado: EstadoCliente
  total: number
  prendas: number
  detalle: GrupoPrecio[]
}> {
  const utiles = items.filter((item) => item.cantidad > 0)
  if (utiles.length === 0) return { ok: false, mensaje: MENSAJE_CANASTA_VACIA }

  const detalle = agruparPorPrecio(utiles)
  const prendas = totalPrendas(detalle)
  if (prendas <= 0) return { ok: false, mensaje: MENSAJE_CANASTA_VACIA }

  const total = totalCanasta(detalle)
  const calculo = calcularEnvio(total, saldoFavor)
  return {
    ok: true,
    datos: {
      nuevoSaldoFavor: calculo.nuevoSaldoFavor,
      nuevoEstado: calculo.nuevoEstado,
      total,
      prendas,
      detalle,
    },
  }
}

export function agruparCanastasAbiertas(filas: FilaAgrupable[]): CanastaAbierta[] {
  const porCliente = new Map<
    string,
    { codigo: string; nombre: string | null; telefono: string; saldoFavor: number; items: ItemCanasta[] }
  >()

  for (const fila of filas) {
    if (!(fila.cantidad > 0)) continue
    const actual = porCliente.get(fila.clienteId) ?? {
      codigo: fila.codigo,
      nombre: fila.nombre,
      telefono: fila.telefono,
      saldoFavor: fila.saldoFavor,
      items: [],
    }
    actual.items.push({ precio: fila.precio, cantidad: fila.cantidad })
    porCliente.set(fila.clienteId, actual)
  }

  return ordenarPorCanasta(
    [...porCliente.entries()]
      .map(([clienteId, datos]) => {
        const grupos = agruparPorPrecio(datos.items)
        const total = totalCanasta(grupos)
        return {
          clienteId,
          codigo: datos.codigo,
          nombre: datos.nombre,
          telefono: datos.telefono,
          saldoFavor: redondear2(Math.max(0, datos.saldoFavor)),
          prendas: totalPrendas(grupos),
          total,
          saldo: saldoPendiente(total, datos.saldoFavor),
          grupos,
        }
      })
      .filter((canasta) => canasta.prendas > 0),
  )
}

export async function listarCanastasAbiertas(): Promise<Resultado<CanastaAbierta[]>> {
  const db = preparar()
  if (esFallo(db)) return db

  try {
    const { data, error } = await db
      .from('canasta_items')
      .select('precio, cantidad, clientes(id, codigo, nombre, telefono, saldo_favor)')

    if (error) return { ok: false, mensaje: mensajeErrorEnvio(error, 'cargar las canastas') }
    const filas = leerFilasCanasta(data)
    if (!filas) return { ok: false, mensaje: 'No se pudieron leer las canastas.' }
    return { ok: true, datos: agruparCanastasAbiertas(filas) }
  } catch (error) {
    return { ok: false, mensaje: mensajeErrorEnvio(error, 'cargar las canastas') }
  }
}

/**
 * Da la canasta por pagada.
 * Si un paso posterior falla, se deshace lo ya guardado: el navegador no abre una transacción.
 */
export async function registrarEnvio(
  clienteId: string,
  tipo: TipoEnvio,
): Promise<Resultado<EnvioRegistrado>> {
  const db = preparar()
  if (esFallo(db)) return db
  if (!esTipoEnvio(tipo)) return { ok: false, mensaje: 'Elige Local, Uber o Servientrega.' }
  if (!clienteId.trim()) return { ok: false, mensaje: MENSAJE_NO_ENCONTRADO }

  let cliente: ClienteEnvio | null = null
  let saldoCambiado = false
  let canastaBorrada = false

  try {
    const leido = await leerClienteYCanasta(db, clienteId)
    if (!leido.ok) return leido
    cliente = leido.datos

    const registro = armarRegistroEnvio(cliente.items, cliente.saldoFavor)
    if (!registro.ok) return registro

    const { data: actualizado, error: errorSaldo } = await db
      .from('clientes')
      .update({
        saldo_favor: registro.datos.nuevoSaldoFavor,
        estado: registro.datos.nuevoEstado,
      })
      .eq('id', clienteId)
      .eq('saldo_favor', cliente.saldoCrudo)
      .eq('estado', cliente.estado)
      .select('id')

    if (errorSaldo || !actualizado?.length) {
      return {
        ok: false,
        mensaje: errorSaldo ? mensajeErrorEnvio(errorSaldo, 'actualizar el saldo') : MENSAJE_CAMBIO,
      }
    }
    saldoCambiado = true

    const { data: borrados, error: errorBorrado } = await db
      .from('canasta_items')
      .delete()
      .eq('cliente_id', clienteId)
      .select('id')

    if (errorBorrado || !borrados?.length) {
      const deshecho = await deshacerEnvio(db, cliente, saldoCambiado, false)
      if (!deshecho) return { ok: false, mensaje: MENSAJE_SALDO_SIN_ENVIO }
      return {
        ok: false,
        mensaje: errorBorrado ? mensajeErrorEnvio(errorBorrado, 'vaciar la canasta') : MENSAJE_CAMBIO,
      }
    }
    canastaBorrada = true

    const fecha = fechaHoy()
    const { data: creado, error: errorEnvio } = await db
      .from('envios')
      .insert({
        cliente_id: clienteId,
        codigo_cliente: cliente.codigo,
        tipo_envio: tipo,
        fecha,
        total: registro.datos.total,
        total_prendas: registro.datos.prendas,
        detalle: registro.datos.detalle,
      })
      .select('id, fecha, codigo_cliente, tipo_envio, total, total_prendas, detalle')
      .single()

    if (errorEnvio || !creado) {
      const deshecho = await deshacerEnvio(db, cliente, true, true)
      if (!deshecho) return { ok: false, mensaje: MENSAJE_RECUPERAR }
      return {
        ok: false,
        mensaje: errorEnvio
          ? mensajeErrorEnvio(errorEnvio, 'registrar el envío')
          : 'No se pudo registrar el envío. Inténtalo de nuevo.',
      }
    }

    const envio = leerEnvio(creado) ?? {
      id: typeof creado.id === 'string' ? creado.id : '',
      fecha,
      codigo: cliente.codigo,
      tipo,
      prendas: registro.datos.prendas,
      total: registro.datos.total,
      detalle: registro.datos.detalle,
    }

    return {
      ok: true,
      datos: {
        envio,
        nuevoSaldoFavor: registro.datos.nuevoSaldoFavor,
        nuevoEstado: registro.datos.nuevoEstado,
      },
    }
  } catch (error) {
    if (cliente && (saldoCambiado || canastaBorrada)) {
      const deshecho = await deshacerEnvio(db, cliente, saldoCambiado, canastaBorrada)
      if (!deshecho) return { ok: false, mensaje: MENSAJE_RECUPERAR }
    }
    return { ok: false, mensaje: mensajeErrorEnvio(error, 'registrar el envío') }
  }
}

export async function listarEnviosSemana(): Promise<Resultado<EnvioSemana[]>> {
  const db = preparar()
  if (esFallo(db)) return db

  const ahora = new Date()
  const corte = fechaCorteEnvios(ahora)

  try {
    const { data, error } = await db
      .from('envios')
      .select('id, fecha, codigo_cliente, tipo_envio, total, total_prendas, detalle')
      .gte('fecha', corte)
      .order('fecha', { ascending: false })

    if (error) return { ok: false, mensaje: mensajeErrorEnvio(error, 'cargar el historial') }
    const envios = leerEnvios(data)
    if (!envios) return { ok: false, mensaje: 'No se pudo leer el historial.' }
    return { ok: true, datos: envios.filter((envio) => !envioEsAntiguo(envio.fecha, ahora)) }
  } catch (error) {
    return { ok: false, mensaje: mensajeErrorEnvio(error, 'cargar el historial') }
  }
}

export async function borrarEnviosAntiguos(): Promise<Resultado<null>> {
  const db = preparar()
  if (esFallo(db)) return db

  try {
    const { error } = await db.from('envios').delete().lt('fecha', fechaCorteEnvios(new Date()))
    if (error) return { ok: false, mensaje: mensajeErrorEnvio(error, 'borrar los envíos antiguos') }
    return { ok: true, datos: null }
  } catch (error) {
    return { ok: false, mensaje: mensajeErrorEnvio(error, 'borrar los envíos antiguos') }
  }
}

async function leerClienteYCanasta(
  db: SupabaseClient,
  clienteId: string,
): Promise<Resultado<ClienteEnvio>> {
  const { data, error } = await db
    .from('clientes')
    .select('id, codigo, estado, saldo_favor, canasta_items(id, precio, cantidad)')
    .eq('id', clienteId)
    .maybeSingle()

  if (error) return { ok: false, mensaje: mensajeErrorEnvio(error, 'abrir la canasta') }
  const cliente = leerClienteEnvio(data)
  if (!cliente) return { ok: false, mensaje: MENSAJE_NO_ENCONTRADO }
  return { ok: true, datos: cliente }
}

async function deshacerEnvio(
  db: SupabaseClient,
  cliente: ClienteEnvio,
  saldoCambiado: boolean,
  canastaBorrada: boolean,
): Promise<boolean> {
  try {
    const canastaOk = canastaBorrada ? await restaurarCanasta(db, cliente.id, cliente.items) : true
    const saldoOk = saldoCambiado
      ? await restaurarCliente(db, cliente.id, cliente.saldoCrudo, cliente.estado)
      : true
    return canastaOk && saldoOk
  } catch {
    return false
  }
}

async function restaurarCliente(
  db: SupabaseClient,
  clienteId: string,
  saldoCrudo: number | string,
  estado: EstadoCliente,
): Promise<boolean> {
  const { data, error } = await db
    .from('clientes')
    .update({ saldo_favor: saldoCrudo, estado })
    .eq('id', clienteId)
    .select('id')
  return !error && !!data?.length
}

async function restaurarCanasta(
  db: SupabaseClient,
  clienteId: string,
  items: ItemGuardado[],
): Promise<boolean> {
  if (items.length === 0) return true
  const { error } = await db.from('canasta_items').insert(
    items.map((item) => ({
      cliente_id: clienteId,
      precio: item.precio,
      cantidad: item.cantidad,
    })),
  )
  return !error
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

function leerFilasCanasta(data: unknown): FilaAgrupable[] | null {
  if (!Array.isArray(data)) return null
  const filas: FilaAgrupable[] = []

  for (const valor of data) {
    if (typeof valor !== 'object' || valor === null) return null
    const fila = valor as Record<string, unknown>
    const precio = Number(fila.precio)
    const cantidad = Number(fila.cantidad)
    if (!Number.isFinite(precio) || !Number.isFinite(cantidad)) return null

    const cliente = clienteEmbebido(fila.clientes)
    if (cliente === 'invalido') return null
    if (!cliente) continue

    filas.push({
      clienteId: cliente.id,
      codigo: cliente.codigo,
      nombre: cliente.nombre,
      telefono: cliente.telefono,
      saldoFavor: cliente.saldoFavor,
      precio: redondear2(precio),
      cantidad,
    })
  }

  return filas
}

function clienteEmbebido(
  valor: unknown,
): { id: string; codigo: string; nombre: string | null; telefono: string; saldoFavor: number } | null | 'invalido' {
  const fila = Array.isArray(valor) ? valor[0] : valor
  if (fila == null) return null
  if (typeof fila !== 'object') return 'invalido'
  const datos = fila as Record<string, unknown>
  if (typeof datos.id !== 'string' || typeof datos.codigo !== 'string') return 'invalido'
  if (!(datos.nombre === null || datos.nombre === undefined || typeof datos.nombre === 'string')) {
    return 'invalido'
  }
  if (typeof datos.telefono !== 'string') return 'invalido'
  const saldo = Number(datos.saldo_favor)
  if (!Number.isFinite(saldo)) return 'invalido'
  const nombre = typeof datos.nombre === 'string' && datos.nombre.trim() ? datos.nombre.trim() : null
  return {
    id: datos.id,
    codigo: datos.codigo,
    nombre,
    telefono: datos.telefono,
    saldoFavor: redondear2(Math.max(0, saldo)),
  }
}

function leerClienteEnvio(valor: unknown): ClienteEnvio | null {
  if (typeof valor !== 'object' || valor === null) return null
  const fila = valor as Record<string, unknown>
  if (typeof fila.id !== 'string' || typeof fila.codigo !== 'string') return null
  if (fila.estado !== 'activo' && fila.estado !== 'inactivo') return null
  if (typeof fila.saldo_favor !== 'number' && typeof fila.saldo_favor !== 'string') return null

  const saldo = Number(fila.saldo_favor)
  if (!Number.isFinite(saldo)) return null
  const items = fila.canasta_items == null ? [] : leerItems(fila.canasta_items)
  if (!items) return null

  return {
    id: fila.id,
    codigo: fila.codigo,
    estado: fila.estado,
    saldoCrudo: fila.saldo_favor,
    saldoFavor: redondear2(Math.max(0, saldo)),
    items,
  }
}

function leerItems(data: unknown): ItemGuardado[] | null {
  if (!Array.isArray(data)) return null
  const items: ItemGuardado[] = []
  for (const valor of data) {
    if (typeof valor !== 'object' || valor === null) return null
    const fila = valor as Record<string, unknown>
    const precio = Number(fila.precio)
    const cantidad = Number(fila.cantidad)
    if (typeof fila.id !== 'string' || !Number.isFinite(precio) || !Number.isFinite(cantidad)) return null
    items.push({ id: fila.id, precio: redondear2(precio), cantidad })
  }
  return items
}

function leerEnvios(data: unknown): EnvioSemana[] | null {
  if (!Array.isArray(data)) return null
  const envios: EnvioSemana[] = []
  for (const fila of data) {
    const envio = leerEnvio(fila)
    if (!envio) return null
    envios.push(envio)
  }
  return envios
}

function leerEnvio(valor: unknown): EnvioSemana | null {
  if (typeof valor !== 'object' || valor === null) return null
  const fila = valor as Record<string, unknown>
  if (typeof fila.id !== 'string' || !fila.id) return null
  const fecha = leerFecha(fila.fecha)
  if (!fecha || typeof fila.codigo_cliente !== 'string') return null
  if (typeof fila.tipo_envio !== 'string' || !fila.tipo_envio) return null

  const total = Number(fila.total)
  const prendas = Number(fila.total_prendas)
  if (!Number.isFinite(total) || !Number.isFinite(prendas)) return null

  return {
    id: fila.id,
    fecha,
    codigo: fila.codigo_cliente,
    tipo: fila.tipo_envio,
    prendas,
    total: redondear2(Math.max(0, total)),
    detalle: leerDetalleEnvio(fila.detalle),
  }
}

/** El detalle guardado es la lista de precio, cantidad y subtotal. Si falta, la venta se abre vacía. */
export function leerDetalleEnvio(valor: unknown): GrupoPrecio[] {
  if (!Array.isArray(valor)) return []
  const grupos: GrupoPrecio[] = []
  for (const fila of valor) {
    if (typeof fila !== 'object' || fila === null) continue
    const datos = fila as Record<string, unknown>
    const precio = Number(datos.precio)
    const cantidad = Number(datos.cantidad)
    if (!Number.isFinite(precio) || !Number.isFinite(cantidad) || cantidad <= 0) continue
    const subtotal = Number(datos.subtotal)
    grupos.push({
      precio: redondear2(precio),
      cantidad,
      subtotal: Number.isFinite(subtotal) ? redondear2(Math.max(0, subtotal)) : redondear2(precio * cantidad),
    })
  }
  return grupos
}

function leerFecha(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  const fecha = /^(\d{4}-\d{2}-\d{2})/.exec(valor)?.[1]
  return fecha ?? null
}

function fechaHoy(): string {
  const ahora = new Date()
  const mes = String(ahora.getMonth() + 1).padStart(2, '0')
  const dia = String(ahora.getDate()).padStart(2, '0')
  return `${ahora.getFullYear()}-${mes}-${dia}`
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
