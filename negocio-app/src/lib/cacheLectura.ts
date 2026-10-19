export type ResultadoLectura<T> = { ok: true; datos: T } | { ok: false; mensaje: string }

export const CLAVE_CLIENTES = 'clientes'
export const CLAVE_PRECIOS = 'precios'
export const CLAVE_RESUMEN_ABONOS = 'abonos-resumen'
export const CLAVE_FECHAS_ABONO = 'abonos-fechas'
export const CLAVE_CANASTAS = 'canastas'
export const CLAVE_ENVIOS = 'envios'
export const CLAVE_ABONOS_CANASTA = 'abonos-canasta'
export const CLAVE_PLANTILLA = 'plantilla-compartir'

const PREFIJO = 'negocio.cache.v1.'
const FRESCURA_MS = 2500

const memoria = new Map<string, unknown>()
const vuelos = new Map<string, Promise<ResultadoLectura<unknown>>>()
const serie = new Map<string, number>()
const escritos = new Map<string, number>()

export function claveDetalleAbono(clienteId: string): string {
  return `abono-detalle:${clienteId}`
}

export function claveCanastaCliente(clienteId: string): string {
  return `canasta-cliente:${clienteId}`
}

export function leerCache<T>(clave: string): T | null {
  if (memoria.has(clave)) return memoria.get(clave) as T

  try {
    const texto = localStorage.getItem(PREFIJO + clave)
    if (!texto) return null
    const datos = JSON.parse(texto) as T
    memoria.set(clave, datos)
    return datos
  } catch {
    return null
  }
}

export function guardarCache<T>(clave: string, datos: T): void {
  memoria.set(clave, datos)
  escritos.set(clave, Date.now())
  try {
    localStorage.setItem(PREFIJO + clave, JSON.stringify(datos))
  } catch {
    // Sin espacio o en modo privado sigue valiendo la copia en memoria.
  }
}

/** Guarda el dato nuevo y descarta una lectura que todavía no había vuelto. */
export function reemplazarCache<T>(clave: string, datos: T): void {
  serie.set(clave, (serie.get(clave) ?? 0) + 1)
  guardarCache(clave, datos)
}

/** Borra listas guardadas. Una respuesta que todavía viajaba no vuelve a escribir. */
export function olvidarDatosGuardados(): void {
  memoria.clear()
  vuelos.clear()
  escritos.clear()
  for (const clave of serie.keys()) serie.set(clave, (serie.get(clave) ?? 0) + 1)
  try {
    const claves: string[] = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const clave = localStorage.key(i)
      if (clave?.startsWith(PREFIJO)) claves.push(clave)
    }
    for (const clave of claves) localStorage.removeItem(clave)
  } catch {
    // Sin almacenamiento local no hay nada que borrar.
  }
}

/**
 * Une pedidos iguales que salgan a la vez.
 * Con `fresco`, la respuesta anterior no pisa el dato nuevo.
 */
export function pedirDatos<T>(
  clave: string,
  cargar: () => Promise<ResultadoLectura<T>>,
  opciones?: { fresco?: boolean },
): Promise<ResultadoLectura<T>> {
  if (!opciones?.fresco) {
    const enCurso = vuelos.get(clave)
    if (enCurso) return enCurso as Promise<ResultadoLectura<T>>
    const reciente = escritos.get(clave)
    const guardado = reciente != null && Date.now() - reciente < FRESCURA_MS ? leerCache<T>(clave) : null
    if (guardado != null) return Promise.resolve({ ok: true, datos: guardado })
  }

  const ticket = (serie.get(clave) ?? 0) + 1
  serie.set(clave, ticket)

  const promesa = cargar()
    .then((resultado) => {
      if (serie.get(clave) === ticket && resultado.ok) guardarCache(clave, resultado.datos)
      return resultado
    })
    .finally(() => {
      if (vuelos.get(clave) === promesa) vuelos.delete(clave)
    })

  vuelos.set(clave, promesa as Promise<ResultadoLectura<unknown>>)
  return promesa
}
