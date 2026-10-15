import { redondear2 } from '../lib/dinero.ts'
import {
  VALORES_EJEMPLO,
  cambiosDeOrden,
  siguienteOrden,
  type CambioOrden,
  type DireccionOrden,
} from '../lib/precios.ts'
import { supabase } from '../lib/supabase.ts'

const MENSAJE_SIN_CONEXION = 'Sin conexión. Revisa tu internet e inténtalo de nuevo.'
const MENSAJE_CONFIG = 'Faltan los datos de conexión. Revisa la configuración de la app.'
const MENSAJE_REPETIDO = 'Ese valor ya está en el catálogo.'
const MENSAJE_NO_ENCONTRADO = 'Ese valor ya no está en el catálogo.'

export type Precio = {
  id: string
  valor: number
  orden: number
}

export type Resultado = { ok: true } | { ok: false; mensaje: string }
export type ResultadoDatos<T> = { ok: true; datos: T } | { ok: false; mensaje: string }

type FilaPrecio = {
  id: string
  valor: number | string
  orden: number | string
}

function sinConexion(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

function esMensajeDeRed(mensaje: string): boolean {
  const texto = mensaje.toLowerCase()
  return (
    texto.includes('failed to fetch') ||
    texto.includes('fetch failed') ||
    texto.includes('networkerror') ||
    texto.includes('network request failed') ||
    texto.includes('load failed')
  )
}

function esErrorConCodigo(error: unknown): error is { message: string; code: string } {
  if (typeof error !== 'object' || error === null) return false
  if (!('message' in error) || !('code' in error)) return false
  return typeof error.message === 'string' && typeof error.code === 'string'
}

/** Traduce un error de Supabase a un mensaje que se puede mostrar. */
export function mensajeErrorPrecio(error: unknown, fallback: string): string {
  if (error instanceof Error && esMensajeDeRed(error.message)) return MENSAJE_SIN_CONEXION
  if (!esErrorConCodigo(error)) return fallback
  if (esMensajeDeRed(error.message)) return MENSAJE_SIN_CONEXION
  if (error.code === '23505') return MENSAJE_REPETIDO
  if (error.code === '42501' || error.code === 'PGRST301') {
    return 'La sesión expiró. Vuelve a entrar.'
  }
  return fallback
}

function aPrecio(fila: FilaPrecio): Precio {
  return {
    id: fila.id,
    valor: redondear2(Number(fila.valor)),
    orden: Number(fila.orden),
  }
}

function ordenar(precios: Precio[]): Precio[] {
  return precios.slice().sort((a, b) => a.orden - b.orden || a.valor - b.valor)
}

export async function listarPrecios(): Promise<ResultadoDatos<Precio[]>> {
  if (!supabase) return { ok: false, mensaje: MENSAJE_CONFIG }
  if (sinConexion()) return { ok: false, mensaje: MENSAJE_SIN_CONEXION }

  try {
    const { data, error } = await supabase
      .from('precios')
      .select('id, valor, orden')
      .order('orden', { ascending: true })
      .order('valor', { ascending: true })

    if (error) return { ok: false, mensaje: mensajeErrorPrecio(error, 'No se pudieron cargar los valores.') }
    return { ok: true, datos: ordenar(((data ?? []) as FilaPrecio[]).map(aPrecio)) }
  } catch (error) {
    return { ok: false, mensaje: mensajeErrorPrecio(error, 'No se pudieron cargar los valores.') }
  }
}

async function fijarOrden(id: string, orden: number): Promise<Resultado | null> {
  if (!supabase) return { ok: false, mensaje: MENSAJE_CONFIG }

  const { data, error } = await supabase
    .from('precios')
    .update({ orden })
    .eq('id', id)
    .select('id')

  if (error) return { ok: false, mensaje: mensajeErrorPrecio(error, 'No se pudo cambiar el orden.') }
  if (!data || data.length === 0) return { ok: false, mensaje: MENSAJE_NO_ENCONTRADO }
  return null
}

/** Dos pasos para no chocar si `orden` es único: primero un número libre, luego el definitivo. */
async function aplicarOrden(cambios: CambioOrden[], ordenesActuales: number[]): Promise<Resultado> {
  const maximo = ordenesActuales.reduce((max, orden) => Math.max(max, orden), 0)

  for (let indice = 0; indice < cambios.length; indice += 1) {
    const cambio = cambios[indice]
    if (!cambio) continue
    const error = await fijarOrden(cambio.id, maximo + 1 + indice)
    if (error) return error
  }

  for (const cambio of cambios) {
    const error = await fijarOrden(cambio.id, cambio.orden)
    if (error) return error
  }

  return { ok: true }
}

export async function crearPrecio(valor: number): Promise<ResultadoDatos<Precio>> {
  if (!supabase) return { ok: false, mensaje: MENSAJE_CONFIG }
  if (sinConexion()) return { ok: false, mensaje: MENSAJE_SIN_CONEXION }

  const monto = redondear2(valor)
  if (!(monto > 0)) return { ok: false, mensaje: 'El valor debe ser mayor que 0.' }

  const actuales = await listarPrecios()
  if (!actuales.ok) return actuales
  if (actuales.datos.some((precio) => precio.valor === monto)) {
    return { ok: false, mensaje: MENSAJE_REPETIDO }
  }

  try {
    const { data, error } = await supabase
      .from('precios')
      .insert({ valor: monto, orden: siguienteOrden(actuales.datos.map((precio) => precio.orden)) })
      .select('id, valor, orden')
      .maybeSingle()

    if (error) return { ok: false, mensaje: mensajeErrorPrecio(error, 'No se pudo agregar el valor.') }
    if (!data) return { ok: false, mensaje: 'No se pudo agregar el valor.' }
    return { ok: true, datos: aPrecio(data as FilaPrecio) }
  } catch (error) {
    return { ok: false, mensaje: mensajeErrorPrecio(error, 'No se pudo agregar el valor.') }
  }
}

export async function actualizarPrecio(id: string, valor: number): Promise<ResultadoDatos<Precio>> {
  if (!supabase) return { ok: false, mensaje: MENSAJE_CONFIG }
  if (sinConexion()) return { ok: false, mensaje: MENSAJE_SIN_CONEXION }

  const monto = redondear2(valor)
  if (!(monto > 0)) return { ok: false, mensaje: 'El valor debe ser mayor que 0.' }

  const actuales = await listarPrecios()
  if (!actuales.ok) return actuales
  // La canasta guarda su propio precio. Cambiar el catálogo no toca canasta_items.
  if (actuales.datos.some((precio) => precio.id !== id && precio.valor === monto)) {
    return { ok: false, mensaje: MENSAJE_REPETIDO }
  }

  try {
    const { data, error } = await supabase
      .from('precios')
      .update({ valor: monto })
      .eq('id', id)
      .select('id, valor, orden')
      .maybeSingle()

    if (error) return { ok: false, mensaje: mensajeErrorPrecio(error, 'No se pudo actualizar el valor.') }
    if (!data) return { ok: false, mensaje: MENSAJE_NO_ENCONTRADO }
    return { ok: true, datos: aPrecio(data as FilaPrecio) }
  } catch (error) {
    return { ok: false, mensaje: mensajeErrorPrecio(error, 'No se pudo actualizar el valor.') }
  }
}

export async function eliminarPrecio(id: string): Promise<Resultado> {
  if (!supabase) return { ok: false, mensaje: MENSAJE_CONFIG }
  if (sinConexion()) return { ok: false, mensaje: MENSAJE_SIN_CONEXION }

  try {
    // Borrar del catálogo no borra los precios ya copiados en canasta_items.
    const { data, error } = await supabase.from('precios').delete().eq('id', id).select('id')
    if (error) return { ok: false, mensaje: mensajeErrorPrecio(error, 'No se pudo eliminar el valor.') }
    if (!data || data.length === 0) return { ok: false, mensaje: MENSAJE_NO_ENCONTRADO }
    return { ok: true }
  } catch (error) {
    return { ok: false, mensaje: mensajeErrorPrecio(error, 'No se pudo eliminar el valor.') }
  }
}

export async function cambiarOrden(id: string, direccion: DireccionOrden): Promise<Resultado> {
  if (!supabase) return { ok: false, mensaje: MENSAJE_CONFIG }
  if (sinConexion()) return { ok: false, mensaje: MENSAJE_SIN_CONEXION }

  const actuales = await listarPrecios()
  if (!actuales.ok) return actuales

  const plan = cambiosDeOrden(actuales.datos, id, direccion)
  if (!plan.ok) {
    if (plan.motivo === 'no-encontrado') return { ok: false, mensaje: MENSAJE_NO_ENCONTRADO }
    return {
      ok: false,
      mensaje: direccion === 'subir' ? 'Ese valor ya está al inicio.' : 'Ese valor ya está al final.',
    }
  }

  try {
    return await aplicarOrden(plan.cambios, actuales.datos.map((precio) => precio.orden))
  } catch (error) {
    return { ok: false, mensaje: mensajeErrorPrecio(error, 'No se pudo cambiar el orden.') }
  }
}

export async function crearPreciosDeEjemplo(): Promise<ResultadoDatos<Precio[]>> {
  if (!supabase) return { ok: false, mensaje: MENSAJE_CONFIG }
  if (sinConexion()) return { ok: false, mensaje: MENSAJE_SIN_CONEXION }

  const actuales = await listarPrecios()
  if (!actuales.ok) return actuales
  if (actuales.datos.length > 0) return { ok: false, mensaje: 'El catálogo ya tiene valores.' }

  const filas = VALORES_EJEMPLO.map((valor, indice) => ({
    valor: redondear2(valor),
    orden: indice + 1,
  }))

  try {
    const { data, error } = await supabase.from('precios').insert(filas).select('id, valor, orden')
    if (error) {
      return { ok: false, mensaje: mensajeErrorPrecio(error, 'No se pudieron crear los valores de ejemplo.') }
    }
    return { ok: true, datos: ordenar(((data ?? []) as FilaPrecio[]).map(aPrecio)) }
  } catch (error) {
    return { ok: false, mensaje: mensajeErrorPrecio(error, 'No se pudieron crear los valores de ejemplo.') }
  }
}
