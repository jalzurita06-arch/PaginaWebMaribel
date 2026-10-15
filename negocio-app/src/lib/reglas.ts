import { formatearDolares, redondear2 } from './dinero.ts'

export type ItemCanasta = {
  precio: number
  cantidad: number
}

export type GrupoPrecio = {
  precio: number
  cantidad: number
  subtotal: number
}

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

export function puedeVender(estado: string): boolean {
  return estado === 'activo'
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
