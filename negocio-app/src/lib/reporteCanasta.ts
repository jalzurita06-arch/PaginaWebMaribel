export type CanastaParaReporte = {
  clienteId: string
  codigo: string
  nombre: string | null
  total: number
  saldoFavor: number
  saldo: number
}

export type FilaReporteCanasta = {
  codigo: string
  nombre: string | null
  total: number
  abonado: number
  saldo: number
  montos: number[]
  sinAbonos: boolean
}

/** Arma el reporte de canastas abiertas. Solo montos, sin fechas. Campana si no hay ningún abono. */
export function armarReporteCanasta(
  canastas: CanastaParaReporte[],
  abonosPorCliente: Record<string, { monto: number }[]>,
): FilaReporteCanasta[] {
  return canastas.map((canasta) => {
    const abonos = abonosPorCliente[canasta.clienteId] ?? []
    return {
      codigo: canasta.codigo,
      nombre: canasta.nombre,
      total: canasta.total,
      abonado: canasta.saldoFavor,
      saldo: canasta.saldo,
      montos: abonos.map((abono) => abono.monto),
      sinAbonos: abonos.length === 0,
    }
  })
}
