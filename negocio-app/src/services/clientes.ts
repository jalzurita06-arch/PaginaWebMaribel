import type { SupabaseClient } from '@supabase/supabase-js'
import { organizarAbonosPorCliente, ultimasFechasAbono } from '../lib/abonoAtrasado.ts'
import {
  capitalizarNombre,
  normalizarCodigo,
  type DatosNuevoCliente,
} from '../lib/clienteFormulario.ts'
import { redondear2 } from '../lib/dinero.ts'
import {
  fechaDiaLocal,
  ordenarPorCanasta,
  saldoPendiente,
  saldoTrasEditarAbono,
  sumarAbono,
  totalCanasta,
  totalPrendas,
} from '../lib/reglas.ts'
import { supabase } from '../lib/supabase.ts'

export type EstadoCliente = 'activo' | 'inactivo'

export type Cliente = {
  id: string
  codigo: string
  nombre: string | null
  telefono: string
  estado: EstadoCliente
  saldo_favor: number
}

export type PrendaCanasta = {
  id: string
  precio: number
  cantidad: number
}

export type ClienteVenta = Cliente & { prendas: number }

export type Abono = {
  id: string
  fecha: string
  monto: number
}

export type ItemClienteCanasta = {
  precio: number
  cantidad: number
  fecha: string
}

export type ClienteConItems = ClienteVenta & {
  items: ItemClienteCanasta[]
}

export type ResumenClienteAbono = Cliente & {
  total: number
  saldo: number
  prendas: number
}

export type Resultado<T> = { ok: true; datos: T } | { ok: false; mensaje: string }

export const MENSAJE_CODIGO_REPETIDO = 'Ese código ya existe.'

const MENSAJE_SIN_CONEXION = 'Sin conexión. Revisa tu internet e inténtalo de nuevo.'
const MENSAJE_CONFIG = 'Faltan los datos de conexión. Revisa la configuración de la app.'
const MENSAJE_NO_ENCONTRADO = 'No se encontró el cliente.'
const COLUMNAS = 'id, codigo, nombre, telefono, estado, saldo_favor'
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

let vueloClientes: Promise<Resultado<ClienteConItems[]>> | null = null
let vueloAbonos: Promise<Resultado<FilasAbonoTodas>> | null = null

type FilasAbonoTodas = {
  porCliente: Record<string, Abono[]>
  fechas: Record<string, string>
}

export function esUuid(id: string): boolean {
  return UUID.test(id.trim())
}

type ErrorDatos = { code?: string; message?: string }

/** Traduce un error de la base a un mensaje que se puede mostrar. */
export function mensajeErrorCliente(error: unknown, accion: string): string {
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

  return `No se pudo ${accion}. Inténtalo de nuevo.`
}

/** Una sola lectura: clientes, prendas y fechas de canasta. Las pantallas reutilizan el vuelo. */
export async function listarClientesConItems(): Promise<Resultado<ClienteConItems[]>> {
  if (vueloClientes) return vueloClientes
  vueloClientes = cargarClientesConItems().finally(() => {
    vueloClientes = null
  })
  return vueloClientes
}

export function clientesVentaDe(filas: ClienteConItems[]): ClienteVenta[] {
  return filas.map(({ items: _items, ...cliente }) => cliente)
}

export function resumenAbonosDe(filas: ClienteConItems[]): ResumenClienteAbono[] {
  return filas.map((fila) => {
    const total = totalCanasta(fila.items)
    return {
      id: fila.id,
      codigo: fila.codigo,
      nombre: fila.nombre,
      telefono: fila.telefono,
      estado: fila.estado,
      saldo_favor: fila.saldo_favor,
      total,
      saldo: saldoPendiente(total, fila.saldo_favor),
      prendas: fila.prendas,
    }
  })
}

export async function listarClientes(busqueda?: string): Promise<Resultado<ClienteVenta[]>> {
  const filas = await listarClientesConItems()
  if (!filas.ok) return filas
  const termino = busqueda?.trim() ?? ''
  const datos = clientesVentaDe(filas.datos)
  if (!termino) return { ok: true, datos }
  const consulta = termino.toLocaleLowerCase('es')
  return {
    ok: true,
    datos: datos.filter(
      (cliente) =>
        cliente.codigo.toLocaleLowerCase('es').includes(consulta) ||
        Boolean(cliente.nombre?.toLocaleLowerCase('es').includes(consulta)),
    ),
  }
}

export async function listarClientesVenta(busqueda?: string): Promise<Resultado<ClienteVenta[]>> {
  return listarClientes(busqueda)
}

export async function listarResumenAbonos(
  busqueda?: string,
): Promise<Resultado<ResumenClienteAbono[]>> {
  const filas = await listarClientesConItems()
  if (!filas.ok) return filas
  const termino = busqueda?.trim() ?? ''
  const datos = resumenAbonosDe(filas.datos)
  if (!termino) return { ok: true, datos }
  const consulta = termino.toLocaleLowerCase('es')
  return {
    ok: true,
    datos: datos.filter(
      (cliente) =>
        cliente.codigo.toLocaleLowerCase('es').includes(consulta) ||
        Boolean(cliente.nombre?.toLocaleLowerCase('es').includes(consulta)),
    ),
  }
}

async function cargarClientesConItems(): Promise<Resultado<ClienteConItems[]>> {
  const db = preparar()
  if (esFallo(db)) return db

  try {
    const { data, error } = await db
      .from('clientes')
      .select(`${COLUMNAS}, canasta_items(precio, cantidad, created_at)`)
      .order('codigo', { ascending: true })
    if (error) return { ok: false, mensaje: mensajeErrorCliente(error, 'cargar los clientes') }
    const clientes = leerClientesConItems(data)
    if (!clientes) return { ok: false, mensaje: 'No se pudo leer la lista de clientes.' }
    return { ok: true, datos: ordenarPorCanasta(clientes) }
  } catch (error) {
    return { ok: false, mensaje: mensajeErrorCliente(error, 'cargar los clientes') }
  }
}

export async function obtenerCliente(id: string): Promise<Resultado<Cliente>> {
  if (!esUuid(id)) return { ok: false, mensaje: MENSAJE_NO_ENCONTRADO }
  const db = preparar()
  if (esFallo(db)) return db

  try {
    const { data, error } = await db.from('clientes').select(COLUMNAS).eq('id', id).maybeSingle()
    if (error) return { ok: false, mensaje: mensajeErrorCliente(error, 'abrir el cliente') }
    const cliente = leerCliente(data)
    if (!cliente) return { ok: false, mensaje: MENSAJE_NO_ENCONTRADO }
    return { ok: true, datos: cliente }
  } catch (error) {
    return { ok: false, mensaje: mensajeErrorCliente(error, 'abrir el cliente') }
  }
}

export async function crearCliente(datos: DatosNuevoCliente): Promise<Resultado<Cliente>> {
  const db = preparar()
  if (esFallo(db)) return db

  const campos = leerCampos(datos)
  if (!campos.ok) return campos

  const abonoInicial = leerMontoOpcional(datos.abonoInicial)
  if (!abonoInicial.ok) return abonoInicial

  try {
    const ocupado = await codigoOcupado(db, campos.codigo)
    if (!ocupado.ok) return ocupado
    if (ocupado.datos) return { ok: false, mensaje: MENSAJE_CODIGO_REPETIDO }

    const { data, error } = await db
      .from('clientes')
      .insert({
        codigo: campos.codigo,
        nombre: campos.nombre,
        telefono: campos.telefono,
        estado: 'activo',
        saldo_favor: 0,
      })
      .select(COLUMNAS)
      .single()

    if (error) {
      if (error.code === '23505') return { ok: false, mensaje: MENSAJE_CODIGO_REPETIDO }
      return { ok: false, mensaje: mensajeErrorCliente(error, 'agregar el cliente') }
    }

    const cliente = leerCliente(data)
    if (!cliente) return { ok: false, mensaje: 'No se pudo leer el cliente agregado.' }
    if (abonoInicial.monto == null) return { ok: true, datos: cliente }

    const abono = await agregarAbono(cliente.id, abonoInicial.monto, fechaHoy())
    if (abono.ok) return abono

    // Si el abono no queda guardado, el cliente tampoco: se crearon juntos.
    const { error: errorBorrado } = await db.from('clientes').delete().eq('id', cliente.id)
    if (errorBorrado) {
      return {
        ok: false,
        mensaje:
          'El cliente se creó, pero el abono inicial no se guardó. Revisa su saldo antes de intentar de nuevo.',
      }
    }
    return abono
  } catch (error) {
    return { ok: false, mensaje: mensajeErrorCliente(error, 'agregar el cliente') }
  }
}

export async function actualizarCliente(
  id: string,
  cambios: { codigo?: string; nombre?: string | null; telefono?: string },
): Promise<Resultado<Cliente>> {
  if (!esUuid(id)) return { ok: false, mensaje: MENSAJE_NO_ENCONTRADO }
  const db = preparar()
  if (esFallo(db)) return db

  const payload: { codigo?: string; nombre?: string | null; telefono?: string } = {}

  if (cambios.codigo !== undefined) {
    const codigo = normalizarCodigo(cambios.codigo)
    if (!codigo) return { ok: false, mensaje: 'Escribe el código.' }
    payload.codigo = codigo
  }

  if (cambios.telefono !== undefined) {
    const telefono = leerTelefono(cambios.telefono)
    if (!telefono.ok) return telefono
    payload.telefono = telefono.numero
  }

  if (cambios.nombre !== undefined) {
    payload.nombre = cambios.nombre?.trim() || null
  }

  if (Object.keys(payload).length === 0) {
    return { ok: false, mensaje: 'No hay cambios para guardar.' }
  }

  try {
    if (payload.codigo) {
      const ocupado = await codigoOcupado(db, payload.codigo, id)
      if (!ocupado.ok) return ocupado
      if (ocupado.datos) return { ok: false, mensaje: MENSAJE_CODIGO_REPETIDO }
    }

    const { data, error } = await db
      .from('clientes')
      .update(payload)
      .eq('id', id)
      .select(COLUMNAS)
      .maybeSingle()

    if (error) {
      if (error.code === '23505') return { ok: false, mensaje: MENSAJE_CODIGO_REPETIDO }
      return { ok: false, mensaje: mensajeErrorCliente(error, 'guardar el cliente') }
    }

    const cliente = leerCliente(data)
    if (!cliente) return { ok: false, mensaje: MENSAJE_NO_ENCONTRADO }
    return { ok: true, datos: cliente }
  } catch (error) {
    return { ok: false, mensaje: mensajeErrorCliente(error, 'guardar el cliente') }
  }
}

export async function cambiarEstadoCliente(
  id: string,
  estado: EstadoCliente,
): Promise<Resultado<Cliente>> {
  if (!esUuid(id)) return { ok: false, mensaje: MENSAJE_NO_ENCONTRADO }
  const db = preparar()
  if (esFallo(db)) return db

  if (estado !== 'activo' && estado !== 'inactivo') {
    return { ok: false, mensaje: 'El estado tiene que ser activo o inactivo.' }
  }

  try {
    const { data, error } = await db
      .from('clientes')
      .update({ estado })
      .eq('id', id)
      .select(COLUMNAS)
      .maybeSingle()

    if (error) return { ok: false, mensaje: mensajeErrorCliente(error, 'cambiar el estado') }
    const cliente = leerCliente(data)
    if (!cliente) return { ok: false, mensaje: MENSAJE_NO_ENCONTRADO }
    return { ok: true, datos: cliente }
  } catch (error) {
    return { ok: false, mensaje: mensajeErrorCliente(error, 'cambiar el estado') }
  }
}

export async function eliminarCliente(id: string): Promise<Resultado<null>> {
  if (!esUuid(id)) return { ok: false, mensaje: MENSAJE_NO_ENCONTRADO }
  const db = preparar()
  if (esFallo(db)) return db

  try {
    // La base borra en cascada la canasta, los abonos y los envíos.
    const { data, error } = await db.from('clientes').delete().eq('id', id).select('id')
    if (error) {
      if (error.code === '23503') {
        return {
          ok: false,
          mensaje: 'No se pudo eliminar el cliente porque todavía tiene datos ligados.',
        }
      }
      return { ok: false, mensaje: mensajeErrorCliente(error, 'eliminar el cliente') }
    }
    if (!data?.length) return { ok: false, mensaje: MENSAJE_NO_ENCONTRADO }
    return { ok: true, datos: null }
  } catch (error) {
    return { ok: false, mensaje: mensajeErrorCliente(error, 'eliminar el cliente') }
  }
}

/** Registra el abono y suma el monto al saldo. Si el cliente estaba inactivo y queda saldo, pasa a activo. */
export async function agregarAbono(
  clienteId: string,
  monto: number,
  fecha: string,
): Promise<Resultado<Cliente>> {
  if (!esUuid(clienteId)) return { ok: false, mensaje: MENSAJE_NO_ENCONTRADO }
  const db = preparar()
  if (esFallo(db)) return db

  const montoRedondeado = redondear2(monto)
  if (!Number.isFinite(monto) || montoRedondeado <= 0) {
    return { ok: false, mensaje: 'El abono debe ser mayor que 0.' }
  }
  if (!fechaValida(fecha)) return { ok: false, mensaje: 'La fecha del abono no es válida.' }

  try {
    const actual = await filaCliente(db, clienteId)
    if (!actual.ok) return actual

    const nuevoSaldo = sumarAbono(actual.datos.cliente.saldo_favor, montoRedondeado)
    const cambios: { saldo_favor: number; estado?: EstadoCliente } = { saldo_favor: nuevoSaldo }
    if (actual.datos.cliente.estado === 'inactivo' && nuevoSaldo > 0) {
      cambios.estado = 'activo'
    }

    const { data: abono, error: errorAbono } = await db
      .from('abonos')
      .insert({
        cliente_id: clienteId,
        monto: montoRedondeado,
        fecha,
      })
      .select('id')
      .single()

    if (errorAbono || !abono?.id) {
      return { ok: false, mensaje: mensajeErrorCliente(errorAbono, 'registrar el abono') }
    }

    const { data: actualizado, error: errorSaldo } = await db
      .from('clientes')
      .update(cambios)
      .eq('id', clienteId)
      .eq('saldo_favor', actual.datos.saldoCrudo)
      .eq('estado', actual.datos.cliente.estado)
      .select(COLUMNAS)

    if (errorSaldo || !actualizado?.length) {
      const { error: errorRollback } = await db.from('abonos').delete().eq('id', abono.id)
      if (errorRollback) {
        return {
          ok: false,
          mensaje:
            'El abono se registró, pero el saldo a favor no se actualizó. Revisa el cliente antes de abonar de nuevo.',
        }
      }
      const mensaje = errorSaldo
        ? mensajeErrorCliente(errorSaldo, 'sumar el abono al saldo')
        : 'El cliente cambió mientras se guardaba el abono. Inténtalo de nuevo.'
      return { ok: false, mensaje }
    }

    const cliente = leerCliente(actualizado[0])
    if (!cliente) return { ok: false, mensaje: 'No se pudo leer el saldo actualizado.' }
    return { ok: true, datos: cliente }
  } catch (error) {
    return { ok: false, mensaje: mensajeErrorCliente(error, 'registrar el abono') }
  }
}

export async function listarAbonos(clienteId: string): Promise<Resultado<Abono[]>> {
  if (!esUuid(clienteId)) return { ok: false, mensaje: MENSAJE_NO_ENCONTRADO }
  const db = preparar()
  if (esFallo(db)) return db

  try {
    const { data, error } = await db
      .from('abonos')
      .select('id, fecha, monto')
      .eq('cliente_id', clienteId)
      .order('fecha', { ascending: false })
    if (error) return { ok: false, mensaje: mensajeErrorCliente(error, 'cargar los abonos') }

    const abonos = leerAbonos(data)
    if (!abonos) return { ok: false, mensaje: 'No se pudo leer la lista de abonos.' }
    abonos.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0))
    return { ok: true, datos: abonos }
  } catch (error) {
    return { ok: false, mensaje: mensajeErrorCliente(error, 'cargar los abonos') }
  }
}

/** Abonos de varias clientas, el más reciente primero. Quien no aparece no tiene abonos. */
export async function listarAbonosDeClientes(
  clienteIds: string[],
): Promise<Resultado<Record<string, Abono[]>>> {
  if (clienteIds.length === 0) return { ok: true, datos: {} }
  const todos = await listarTodosLosAbonos()
  if (!todos.ok) return todos
  const pedidos = new Set(clienteIds)
  const porCliente: Record<string, Abono[]> = {}
  for (const [clienteId, lista] of Object.entries(todos.datos.porCliente)) {
    if (pedidos.has(clienteId)) porCliente[clienteId] = lista
  }
  return { ok: true, datos: porCliente }
}

/** Fechas de abono de todas las clientas, en un solo viaje, para no esperar la lista. */
export async function listarFechasAbono(): Promise<Resultado<Record<string, string>>> {
  const todos = await listarTodosLosAbonos()
  if (!todos.ok) return todos
  return { ok: true, datos: todos.datos.fechas }
}

/** Fecha del último abono de cada clienta. Quien no aparece no tiene abonos. */
export async function listarUltimosAbonos(clienteIds: string[]): Promise<Resultado<Record<string, string>>> {
  if (clienteIds.length === 0) return { ok: true, datos: {} }
  const todos = await listarTodosLosAbonos()
  if (!todos.ok) return todos
  const pedidos = new Set(clienteIds)
  const fechas: Record<string, string> = {}
  for (const [clienteId, fecha] of Object.entries(todos.datos.fechas)) {
    if (pedidos.has(clienteId)) fechas[clienteId] = fecha
  }
  return { ok: true, datos: fechas }
}

export async function listarTodosLosAbonos(): Promise<Resultado<FilasAbonoTodas>> {
  if (vueloAbonos) return vueloAbonos
  vueloAbonos = cargarTodosLosAbonos().finally(() => {
    vueloAbonos = null
  })
  return vueloAbonos
}

async function cargarTodosLosAbonos(): Promise<Resultado<FilasAbonoTodas>> {
  const db = preparar()
  if (esFallo(db)) return db

  try {
    const { data, error } = await db.from('abonos').select('id, cliente_id, fecha, monto')
    if (error) return { ok: false, mensaje: mensajeErrorCliente(error, 'cargar los abonos') }
    const filas = leerAbonosConCliente(data)
    if (!filas) return { ok: false, mensaje: 'No se pudo leer la lista de abonos.' }
    const agrupados = organizarAbonosPorCliente(filas)
    const porCliente: Record<string, Abono[]> = {}
    for (const [clienteId, lista] of Object.entries(agrupados)) {
      porCliente[clienteId] = lista.map(({ id, fecha, monto }) => ({ id, fecha, monto }))
    }
    return {
      ok: true,
      datos: {
        porCliente,
        fechas: ultimasFechasAbono(filas),
      },
    }
  } catch (error) {
    return { ok: false, mensaje: mensajeErrorCliente(error, 'cargar los abonos') }
  }
}

/** Corrige monto y fecha de un abono y mueve el saldo por la diferencia. No crea una devolución. */
export async function editarAbono(
  clienteId: string,
  abonoId: string,
  monto: number,
  fecha: string,
): Promise<Resultado<Cliente>> {
  const db = preparar()
  if (esFallo(db)) return db

  const montoRedondeado = redondear2(monto)
  if (!Number.isFinite(monto) || montoRedondeado <= 0) {
    return { ok: false, mensaje: 'El abono debe ser mayor que 0.' }
  }
  if (!fechaValida(fecha)) return { ok: false, mensaje: 'La fecha del abono no es válida.' }

  try {
    const actual = await filaCliente(db, clienteId)
    if (!actual.ok) return actual
    const guardado = await filaAbono(db, clienteId, abonoId)
    if (!guardado.ok) return guardado

    if (guardado.datos.abono.monto === montoRedondeado && guardado.datos.abono.fecha === fecha) {
      return { ok: true, datos: actual.datos.cliente }
    }

    const nuevoSaldo = saldoTrasEditarAbono(
      actual.datos.cliente.saldo_favor,
      guardado.datos.abono.monto,
      montoRedondeado,
    )
    if (nuevoSaldo == null) {
      return {
        ok: false,
        mensaje: 'No se puede bajar tanto el abono. El saldo a favor no puede quedar en negativo.',
      }
    }

    const cambios: { saldo_favor: number; estado?: EstadoCliente } = { saldo_favor: nuevoSaldo }
    if (actual.datos.cliente.estado === 'inactivo' && nuevoSaldo > 0) {
      cambios.estado = 'activo'
    }
    const cambiaCliente =
      nuevoSaldo !== actual.datos.cliente.saldo_favor || cambios.estado != null

    const { data: abonoActualizado, error: errorAbono } = await db
      .from('abonos')
      .update({ monto: montoRedondeado, fecha })
      .eq('id', abonoId)
      .eq('cliente_id', clienteId)
      .eq('monto', guardado.datos.montoCrudo)
      .eq('fecha', guardado.datos.fechaCruda)
      .select('id')

    if (errorAbono || !abonoActualizado?.length) {
      const mensaje = errorAbono
        ? mensajeErrorCliente(errorAbono, 'guardar el abono')
        : 'El abono cambió mientras se guardaba. Inténtalo de nuevo.'
      return { ok: false, mensaje }
    }

    if (!cambiaCliente) return { ok: true, datos: actual.datos.cliente }

    const { data: actualizado, error: errorSaldo } = await db
      .from('clientes')
      .update(cambios)
      .eq('id', clienteId)
      .eq('saldo_favor', actual.datos.saldoCrudo)
      .eq('estado', actual.datos.cliente.estado)
      .select(COLUMNAS)

    if (errorSaldo || !actualizado?.length) {
      const { error: errorRollback } = await db
        .from('abonos')
        .update({ monto: guardado.datos.montoCrudo, fecha: guardado.datos.fechaCruda })
        .eq('id', abonoId)
      if (errorRollback) {
        return {
          ok: false,
          mensaje:
            'El abono se modificó, pero el saldo a favor no se actualizó. Revisa el cliente antes de editarlo de nuevo.',
        }
      }
      const mensaje = errorSaldo
        ? mensajeErrorCliente(errorSaldo, 'actualizar el saldo')
        : 'El cliente cambió mientras se guardaba el abono. Inténtalo de nuevo.'
      return { ok: false, mensaje }
    }

    const cliente = leerCliente(actualizado[0])
    if (!cliente) return { ok: false, mensaje: 'No se pudo leer el saldo actualizado.' }
    return { ok: true, datos: cliente }
  } catch (error) {
    return { ok: false, mensaje: mensajeErrorCliente(error, 'guardar el abono') }
  }
}

/** Quita un abono y resta su monto del saldo. No crea una devolución. */
export async function borrarAbono(clienteId: string, abonoId: string): Promise<Resultado<Cliente>> {
  const db = preparar()
  if (esFallo(db)) return db

  try {
    const actual = await filaCliente(db, clienteId)
    if (!actual.ok) return actual
    const guardado = await filaAbono(db, clienteId, abonoId)
    if (!guardado.ok) return guardado

    const nuevoSaldo = saldoTrasEditarAbono(actual.datos.cliente.saldo_favor, guardado.datos.abono.monto, 0)
    if (nuevoSaldo == null) {
      return {
        ok: false,
        mensaje: 'No se puede borrar el abono. El saldo a favor no puede quedar en negativo.',
      }
    }

    const { data: abonoBorrado, error: errorAbono } = await db
      .from('abonos')
      .delete()
      .eq('id', abonoId)
      .eq('cliente_id', clienteId)
      .eq('monto', guardado.datos.montoCrudo)
      .eq('fecha', guardado.datos.fechaCruda)
      .select('id')

    if (errorAbono || !abonoBorrado?.length) {
      const mensaje = errorAbono
        ? mensajeErrorCliente(errorAbono, 'borrar el abono')
        : 'El abono cambió mientras se borraba. Inténtalo de nuevo.'
      return { ok: false, mensaje }
    }

    if (nuevoSaldo === actual.datos.cliente.saldo_favor) {
      return { ok: true, datos: actual.datos.cliente }
    }

    const { data: actualizado, error: errorSaldo } = await db
      .from('clientes')
      .update({ saldo_favor: nuevoSaldo })
      .eq('id', clienteId)
      .eq('saldo_favor', actual.datos.saldoCrudo)
      .eq('estado', actual.datos.cliente.estado)
      .select(COLUMNAS)

    if (errorSaldo || !actualizado?.length) {
      const { error: errorRollback } = await db.from('abonos').insert({
        id: abonoId,
        cliente_id: clienteId,
        monto: guardado.datos.montoCrudo,
        fecha: guardado.datos.fechaCruda,
      })
      if (errorRollback) {
        return {
          ok: false,
          mensaje:
            'El abono se borró, pero el saldo a favor no se actualizó. Revisa el cliente antes de editarlo de nuevo.',
        }
      }
      const mensaje = errorSaldo
        ? mensajeErrorCliente(errorSaldo, 'actualizar el saldo')
        : 'El cliente cambió mientras se borraba el abono. Inténtalo de nuevo.'
      return { ok: false, mensaje }
    }

    const cliente = leerCliente(actualizado[0])
    if (!cliente) return { ok: false, mensaje: 'No se pudo leer el saldo actualizado.' }
    return { ok: true, datos: cliente }
  } catch (error) {
    return { ok: false, mensaje: mensajeErrorCliente(error, 'borrar el abono') }
  }
}

export async function listarCanastaCliente(clienteId: string): Promise<Resultado<PrendaCanasta[]>> {
  const db = preparar()
  if (esFallo(db)) return db

  try {
    const { data, error } = await db
      .from('canasta_items')
      .select('id, precio, cantidad')
      .eq('cliente_id', clienteId)
    if (error) return { ok: false, mensaje: mensajeErrorCliente(error, 'revisar la canasta') }

    const prendas = leerPrendas(data)
    if (!prendas) return { ok: false, mensaje: 'No se pudo leer la canasta.' }
    return { ok: true, datos: prendas.filter((prenda) => prenda.cantidad > 0) }
  } catch (error) {
    return { ok: false, mensaje: mensajeErrorCliente(error, 'revisar la canasta') }
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

function leerCampos(
  datos: { codigo: string; nombre?: string | null; telefono: string },
): { ok: true; codigo: string; nombre: string | null; telefono: string } | { ok: false; mensaje: string } {
  const codigo = normalizarCodigo(datos.codigo)
  if (!codigo) return { ok: false, mensaje: 'Escribe el código.' }

  const telefono = leerTelefono(datos.telefono)
  if (!telefono.ok) return telefono

  const nombre = capitalizarNombre(datos.nombre?.trim() ?? '') || null
  return { ok: true, codigo, nombre, telefono: telefono.numero }
}

function leerTelefono(
  valor: string,
): { ok: true; numero: string } | { ok: false; mensaje: string } {
  const telefono = valor.trim()
  if (!telefono) return { ok: false, mensaje: 'Escribe el teléfono.' }
  if (!/^\d+$/.test(telefono)) {
    return { ok: false, mensaje: 'El teléfono solo puede tener números.' }
  }
  if (telefono.length !== 10) {
    return { ok: false, mensaje: 'El teléfono debe tener 10 dígitos.' }
  }
  return { ok: true, numero: telefono }
}

function leerMontoOpcional(
  monto: number | null,
): { ok: true; monto: number | null } | { ok: false; mensaje: string } {
  if (monto == null) return { ok: true, monto: null }
  const redondeado = redondear2(monto)
  if (!Number.isFinite(monto) || redondeado <= 0) {
    return { ok: false, mensaje: 'El abono inicial debe ser mayor que 0.' }
  }
  return { ok: true, monto: redondeado }
}

async function codigoOcupado(
  db: SupabaseClient,
  codigo: string,
  exceptoId?: string,
): Promise<Resultado<boolean>> {
  const { data, error } = await db
    .from('clientes')
    .select('id, codigo')
    .ilike('codigo', escaparIlike(codigo))

  if (error) return { ok: false, mensaje: mensajeErrorCliente(error, 'revisar el código') }

  const ocupado = (data ?? []).some((fila) => {
    if (typeof fila.id !== 'string' || typeof fila.codigo !== 'string') return false
    if (exceptoId && fila.id === exceptoId) return false
    return fila.codigo.localeCompare(codigo, 'es', { sensitivity: 'accent' }) === 0
  })
  return { ok: true, datos: ocupado }
}

async function filaCliente(
  db: SupabaseClient,
  id: string,
): Promise<Resultado<{ cliente: Cliente; saldoCrudo: number | string }>> {
  const { data, error } = await db.from('clientes').select(COLUMNAS).eq('id', id).maybeSingle()
  if (error) return { ok: false, mensaje: mensajeErrorCliente(error, 'abrir el cliente') }

  const cliente = leerCliente(data)
  if (!cliente || data == null || !('saldo_favor' in data)) {
    return { ok: false, mensaje: MENSAJE_NO_ENCONTRADO }
  }

  const saldoCrudo = data.saldo_favor
  if (typeof saldoCrudo !== 'number' && typeof saldoCrudo !== 'string') {
    return { ok: false, mensaje: MENSAJE_NO_ENCONTRADO }
  }
  return { ok: true, datos: { cliente, saldoCrudo } }
}

async function filaAbono(
  db: SupabaseClient,
  clienteId: string,
  abonoId: string,
): Promise<Resultado<{ abono: Abono; montoCrudo: number | string; fechaCruda: string }>> {
  const { data, error } = await db
    .from('abonos')
    .select('id, fecha, monto')
    .eq('id', abonoId)
    .eq('cliente_id', clienteId)
    .maybeSingle()
  if (error) return { ok: false, mensaje: mensajeErrorCliente(error, 'abrir el abono') }

  const abono = data ? leerAbonos([data])?.[0] : null
  if (!abono || data == null || !('monto' in data) || !('fecha' in data)) {
    return { ok: false, mensaje: 'No se encontró el abono.' }
  }

  const montoCrudo = data.monto
  const fechaCruda = data.fecha
  if (
    (typeof montoCrudo !== 'number' && typeof montoCrudo !== 'string') ||
    typeof fechaCruda !== 'string'
  ) {
    return { ok: false, mensaje: 'No se encontró el abono.' }
  }
  return { ok: true, datos: { abono, montoCrudo, fechaCruda } }
}

function leerClientesConItems(data: unknown): ClienteConItems[] | null {
  if (!Array.isArray(data)) return null
  const clientes: ClienteConItems[] = []
  for (const fila of data) {
    const cliente = leerCliente(fila)
    if (!cliente || typeof fila !== 'object' || fila === null) return null
    const items = leerItemsCanastaConFecha((fila as Record<string, unknown>).canasta_items)
    if (!items) return null
    clientes.push({
      ...cliente,
      prendas: totalPrendas(items),
      items,
    })
  }
  return clientes
}

function leerItemsCanastaConFecha(valor: unknown): ItemClienteCanasta[] | null {
  if (valor == null) return []
  if (!Array.isArray(valor)) return null
  const items: ItemClienteCanasta[] = []
  for (const fila of valor) {
    if (typeof fila !== 'object' || fila === null) return null
    const datos = fila as Record<string, unknown>
    const precio = Number(datos.precio)
    const cantidad = Number(datos.cantidad)
    if (!Number.isFinite(precio) || !Number.isFinite(cantidad)) return null
    if (!(cantidad > 0)) continue
    const created = typeof datos.created_at === 'string' ? datos.created_at : ''
    items.push({
      precio: redondear2(precio),
      cantidad,
      fecha: created ? fechaDiaLocal(created) : '',
    })
  }
  return items
}

function leerCliente(valor: unknown): Cliente | null {
  if (typeof valor !== 'object' || valor === null) return null
  const fila = valor as Record<string, unknown>
  if (typeof fila.id !== 'string' || typeof fila.codigo !== 'string') return null
  if (!(fila.nombre === null || typeof fila.nombre === 'string')) return null
  if (typeof fila.telefono !== 'string') return null
  if (fila.estado !== 'activo' && fila.estado !== 'inactivo') return null

  const saldo =
    typeof fila.saldo_favor === 'number' || typeof fila.saldo_favor === 'string'
      ? Number(fila.saldo_favor)
      : Number.NaN
  if (!Number.isFinite(saldo)) return null

  return {
    id: fila.id,
    codigo: normalizarCodigo(fila.codigo),
    nombre: fila.nombre?.trim() ? fila.nombre.trim() : null,
    telefono: fila.telefono,
    estado: fila.estado,
    saldo_favor: redondear2(Math.max(0, saldo)),
  }
}

function leerAbonosConCliente(
  data: unknown,
): { clienteId: string; id: string; fecha: string; monto: number }[] | null {
  if (!Array.isArray(data)) return null
  const filas: { clienteId: string; id: string; fecha: string; monto: number }[] = []
  for (const valor of data) {
    if (typeof valor !== 'object' || valor === null) return null
    const fila = valor as Record<string, unknown>
    const clienteId = typeof fila.cliente_id === 'string' ? fila.cliente_id : ''
    const abonos = leerAbonos([fila])
    if (!clienteId || !abonos) return null
    const abono = abonos[0]
    if (!abono) return null
    filas.push({ clienteId, ...abono })
  }
  return filas
}

function leerAbonos(data: unknown): Abono[] | null {
  if (!Array.isArray(data)) return null
  const abonos: Abono[] = []
  for (const valor of data) {
    if (typeof valor !== 'object' || valor === null) return null
    const fila = valor as Record<string, unknown>
    const monto = Number(fila.monto)
    const fecha = typeof fila.fecha === 'string' ? fila.fecha.slice(0, 10) : ''
    const id = typeof fila.id === 'string' || typeof fila.id === 'number' ? String(fila.id) : ''
    if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !Number.isFinite(monto) || monto < 0) return null
    abonos.push({ id, fecha, monto: redondear2(monto) })
  }
  return abonos
}

function leerPrendas(data: unknown): PrendaCanasta[] | null {
  if (!Array.isArray(data)) return null
  const prendas: PrendaCanasta[] = []
  for (const valor of data) {
    if (typeof valor !== 'object' || valor === null) return null
    const fila = valor as Record<string, unknown>
    const precio = Number(fila.precio)
    const cantidad = Number(fila.cantidad)
    if (typeof fila.id !== 'string' || !Number.isFinite(precio) || !Number.isFinite(cantidad)) {
      return null
    }
    prendas.push({ id: fila.id, precio: redondear2(precio), cantidad })
  }
  return prendas
}

function fechaHoy(): string {
  const ahora = new Date()
  const mes = String(ahora.getMonth() + 1).padStart(2, '0')
  const dia = String(ahora.getDate()).padStart(2, '0')
  return `${ahora.getFullYear()}-${mes}-${dia}`
}

function fechaValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const local = new Date(anio, mes - 1, dia)
  return local.getFullYear() === anio && local.getMonth() === mes - 1 && local.getDate() === dia
}

function escaparIlike(valor: string): string {
  return valor.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
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
