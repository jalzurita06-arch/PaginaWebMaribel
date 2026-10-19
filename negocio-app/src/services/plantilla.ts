import {
  alineadaConCuentas,
  normalizarPlantilla,
  PLANTILLA_INICIAL,
  type PlantillaCompartir,
} from '../lib/plantilla.ts'
import { supabase } from '../lib/supabase.ts'

const MENSAJE_SIN_CONEXION = 'Sin conexión. Revisa tu internet e inténtalo de nuevo.'
const MENSAJE_CONFIG = 'Faltan los datos de conexión. Revisa la configuración de la app.'
const ID = 'principal'

export type ResultadoDatos<T> = { ok: true; datos: T } | { ok: false; mensaje: string }

type FilaPlantilla = {
  banco: string | null
  nombre_titular: string | null
  tipo_cuenta: string | null
  numero_cuenta: string | null
  cedula: string | null
  saludo_con_nombre: string | null
  saludo_sin_nombre: string | null
  cuerpo: string | null
  bloques_mensaje: unknown
  bloques_imagen: unknown
  cuentas: unknown
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

export function mensajeErrorPlantilla(error: unknown, fallback: string): string {
  if (error instanceof Error && esMensajeDeRed(error.message)) return MENSAJE_SIN_CONEXION
  if (!esErrorConCodigo(error)) return fallback
  if (esMensajeDeRed(error.message)) return MENSAJE_SIN_CONEXION
  if (error.code === '42501' || error.code === 'PGRST301') {
    return 'La sesión expiró. Vuelve a entrar.'
  }
  return fallback
}

function aPlantilla(fila: FilaPlantilla): PlantillaCompartir {
  return normalizarPlantilla({
    banco: fila.banco ?? '',
    nombreTitular: fila.nombre_titular ?? '',
    tipoCuenta: fila.tipo_cuenta ?? '',
    numeroCuenta: fila.numero_cuenta ?? '',
    cedula: fila.cedula ?? '',
    saludoConNombre: fila.saludo_con_nombre ?? '',
    saludoSinNombre: fila.saludo_sin_nombre ?? '',
    cuerpo: fila.cuerpo ?? '',
    bloquesMensaje: fila.bloques_mensaje,
    bloquesImagen: fila.bloques_imagen,
    cuentas: fila.cuentas,
  })
}

function aFila(plantilla: PlantillaCompartir) {
  const lista = alineadaConCuentas(normalizarPlantilla(plantilla))
  return {
    id: ID,
    banco: lista.banco,
    nombre_titular: lista.nombreTitular,
    tipo_cuenta: lista.tipoCuenta,
    numero_cuenta: lista.numeroCuenta,
    cedula: lista.cedula,
    saludo_con_nombre: lista.saludoConNombre,
    saludo_sin_nombre: lista.saludoSinNombre,
    cuerpo: lista.cuerpo,
    bloques_mensaje: lista.bloquesMensaje,
    bloques_imagen: lista.bloquesImagen,
    cuentas: lista.cuentas,
    actualizado_en: new Date().toISOString(),
  }
}

const COLUMNAS =
  'banco, nombre_titular, tipo_cuenta, numero_cuenta, cedula, saludo_con_nombre, saludo_sin_nombre, cuerpo, bloques_mensaje, bloques_imagen, cuentas'

export async function obtenerPlantilla(): Promise<ResultadoDatos<PlantillaCompartir>> {
  if (!supabase) return { ok: false, mensaje: MENSAJE_CONFIG }
  if (sinConexion()) return { ok: false, mensaje: MENSAJE_SIN_CONEXION }

  try {
    const { data, error } = await supabase.from('plantilla_compartir').select(COLUMNAS).eq('id', ID).maybeSingle()
    if (error) return { ok: false, mensaje: mensajeErrorPlantilla(error, 'No se pudo cargar el mensaje.') }
    if (!data) return { ok: true, datos: PLANTILLA_INICIAL }
    return { ok: true, datos: aPlantilla(data as FilaPlantilla) }
  } catch (error) {
    return { ok: false, mensaje: mensajeErrorPlantilla(error, 'No se pudo cargar el mensaje.') }
  }
}

export async function guardarPlantilla(plantilla: PlantillaCompartir): Promise<ResultadoDatos<PlantillaCompartir>> {
  if (!supabase) return { ok: false, mensaje: MENSAJE_CONFIG }
  if (sinConexion()) return { ok: false, mensaje: MENSAJE_SIN_CONEXION }

  try {
    const { data, error } = await supabase
      .from('plantilla_compartir')
      .upsert(aFila(plantilla), { onConflict: 'id' })
      .select(COLUMNAS)
      .maybeSingle()

    if (error) return { ok: false, mensaje: mensajeErrorPlantilla(error, 'No se pudo guardar el mensaje.') }
    if (!data) return { ok: false, mensaje: 'No se pudo guardar el mensaje.' }
    return { ok: true, datos: aPlantilla(data as FilaPlantilla) }
  } catch (error) {
    return { ok: false, mensaje: mensajeErrorPlantilla(error, 'No se pudo guardar el mensaje.') }
  }
}
