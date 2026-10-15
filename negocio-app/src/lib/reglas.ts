import { formatearDolares, redondear2 } from './dinero.ts'

export type ItemCanasta = {
  precio: number
  cantidad: number
}

export type ItemCanastaDia = ItemCanasta & {
  fecha: string
}

export type GrupoPrecio = {
  precio: number
  cantidad: number
  subtotal: number
}

export type GrupoDia = {
  fecha: string
  prendas: number
  total: number
  grupos: GrupoPrecio[]
}

const DESFASE_ECUADOR_MS = -5 * 60 * 60 * 1000

export type ResultadoEnvio = {
  nuevoSaldoFavor: number
  nuevoEstado: 'activo' | 'inactivo'
}

export function totalCanasta(items: ItemCanasta[]): number {
  const suma = items.reduce(
    (total, item) => total + redondear2(item.precio * item.cantidad),
    0,
  )
  return redondear2(suma)
}

export function totalPrendas(items: ItemCanasta[]): number {
  return items.reduce((total, item) => total + item.cantidad, 0)
}

/** Lo que falta por cubrir. Nunca es negativo: si el abono alcanza, el saldo es 0. */
export function saldoPendiente(total: number, saldoFavor: number): number {
  return redondear2(Math.max(0, total - saldoFavor))
}

/**
 * Enviar da la canasta por pagada.
 * Si el abono no alcanza, el saldo a favor queda en 0.
 */
export function calcularEnvio(total: number, saldoFavor: number): ResultadoEnvio {
  const nuevoSaldoFavor =
    saldoFavor >= total ? redondear2(Math.max(0, saldoFavor - total)) : 0

  return {
    nuevoSaldoFavor,
    nuevoEstado: nuevoSaldoFavor > 0 ? 'activo' : 'inactivo',
  }
}

export function agruparPorPrecio(items: ItemCanasta[]): GrupoPrecio[] {
  const cantidades = new Map<number, number>()

  for (const item of items) {
    const precio = redondear2(item.precio)
    cantidades.set(precio, (cantidades.get(precio) ?? 0) + item.cantidad)
  }

  return [...cantidades.entries()].map(([precio, cantidad]) => ({
    precio,
    cantidad,
    subtotal: redondear2(precio * cantidad),
  }))
}

/**
 * Fecha de compra en Ecuador (UTC−5, sin horario de verano).
 * Si ya viene como YYYY-MM-DD, se deja igual.
 */
export function fechaDiaLocal(valor: string): string {
  const texto = valor.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto
  const iso = (texto.includes('T') ? texto : texto.replace(' ', 'T')).replace(
    /([+-]\d{2})(?::?(\d{2}))?$/,
    (_, horas: string, minutos?: string) => `${horas}:${minutos ?? '00'}`,
  )
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return /^(\d{4}-\d{2}-\d{2})/.exec(texto)?.[1] ?? ''
  }
  return new Date(date.getTime() + DESFASE_ECUADOR_MS).toISOString().slice(0, 10)
}

/** Junta las prendas por día de compra y, en cada día, por precio. El más reciente va primero. */
export function agruparPorDia(items: ItemCanastaDia[]): GrupoDia[] {
  const porFecha = new Map<string, ItemCanasta[]>()

  for (const item of items) {
    if (!(item.cantidad > 0)) continue
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(item.fecha) ? item.fecha : ''
    const actual = porFecha.get(fecha) ?? []
    actual.push({ precio: item.precio, cantidad: item.cantidad })
    porFecha.set(fecha, actual)
  }

  return [...porFecha.keys()]
    .sort((a, b) => {
      if (a === b) return 0
      if (a === '') return 1
      if (b === '') return -1
      return a < b ? 1 : -1
    })
    .map((fecha) => {
      const grupos = agruparPorPrecio(porFecha.get(fecha) ?? [])
      return {
        fecha,
        prendas: totalPrendas(grupos),
        total: totalCanasta(grupos),
        grupos,
      }
    })
    .filter((dia) => dia.prendas > 0)
}

export function puedeVender(estado: string): boolean {
  return estado === 'activo'
}

/** En todas las listas de clientes: orden alfabético por código. */
export function ordenarPorCanasta<T extends { codigo: string }>(filas: T[]): T[] {
  return [...filas].sort((a, b) => compararCodigo(a.codigo, b.codigo))
}

export const ORDENES_CANASTA = ['codigo', 'saldoMayor', 'saldoMenor'] as const
export type OrdenCanasta = (typeof ORDENES_CANASTA)[number]

/** En Canasta: A–Z, quien debe más o quien debe menos. */
export function ordenarCanastasAbiertas<T extends { codigo: string; saldo: number }>(
  filas: T[],
  orden: OrdenCanasta,
): T[] {
  return [...filas].sort((a, b) => {
    if (orden !== 'codigo' && a.saldo !== b.saldo) {
      return orden === 'saldoMayor' ? b.saldo - a.saldo : a.saldo - b.saldo
    }
    return compararCodigo(a.codigo, b.codigo)
  })
}

function compararCodigo(a: string, b: string): number {
  return a.localeCompare(b, 'es', { sensitivity: 'base' })
}

/** Suma el dinero y las prendas de los envíos que siguen en la semana. */
export function totalesSemana(envios: { total: number; prendas: number }[]): {
  total: number
  prendas: number
} {
  const total = redondear2(envios.reduce((suma, envio) => suma + redondear2(envio.total), 0))
  const prendas = envios.reduce((suma, envio) => suma + envio.prendas, 0)
  return { total, prendas }
}

/** Suma total, saldo y prendas de las canastas que todavía no se envían. */
export function totalesCanastasAbiertas(
  canastas: { total: number; saldo: number; prendas: number }[],
): { total: number; saldo: number; prendas: number } {
  const total = redondear2(canastas.reduce((suma, canasta) => suma + redondear2(canasta.total), 0))
  const saldo = redondear2(canastas.reduce((suma, canasta) => suma + redondear2(canasta.saldo), 0))
  const prendas = canastas.reduce((suma, canasta) => suma + canasta.prendas, 0)
  return { total, saldo, prendas }
}

/**
 * Recalcula el saldo al corregir un abono ya guardado.
 * Null si el resultado sería negativo: no se devuelve dinero por debajo de cero.
 */
export function saldoTrasEditarAbono(
  saldoFavor: number,
  montoAnterior: number,
  montoNuevo: number,
): number | null {
  const base = redondear2(Math.max(0, saldoFavor))
  const anterior = redondear2(Math.max(0, montoAnterior))
  const nuevo = redondear2(Math.max(0, montoNuevo))
  const resultado = redondear2(base - anterior + nuevo)
  if (resultado < 0) return null
  return resultado
}

/** Suma un abono al saldo a favor. Un monto negativo no resta. */
export function sumarAbono(saldoFavor: number, monto: number): number {
  const base = redondear2(Math.max(0, saldoFavor))
  const abono = redondear2(Math.max(0, monto))
  return redondear2(base + abono)
}

/** Lo que sobra del abono después de cubrir el saldo pendiente. Nunca es negativo. */
export function excedenteAbono(total: number, saldoFavor: number, monto: number): number {
  const pendiente = saldoPendiente(total, saldoFavor)
  const abono = redondear2(Math.max(0, monto))
  return redondear2(Math.max(0, abono - pendiente))
}

/** Aviso del sobrante. Si no sobra nada, solo confirma que el abono quedó guardado. */
export function mensajeAbonoRegistrado(excedente: number, reactivo: boolean): string {
  const sobrante = redondear2(Math.max(0, excedente))
  const aviso =
    sobrante > 0
      ? `Queda ${formatearDolares(sobrante)} a favor para su próxima compra.`
      : 'Abono agregado.'
  if (!reactivo) return aviso
  return `${aviso} El cliente volvió a estar activo.`
}
