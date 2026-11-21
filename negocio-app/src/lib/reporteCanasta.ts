import { redondear2 } from './dinero.ts'
import { fechaDiaLocal, type GrupoDia } from './reglas.ts'

export type RangoFechasReporte = {
  desde: string
  hasta: string
}

export type CanastaParaReporte = {
  clienteId: string
  codigo: string
  nombre: string | null
  total: number
  saldoFavor: number
  saldo: number
  prendas: number
  dias: GrupoDia[]
}

export type FilaReporteCanasta = {
  codigo: string
  nombre: string | null
  prendas: number
  ultimaCompra: string
  total: number
  abonado: number
  saldo: number
  montos: number[]
  sinAbonos: boolean
}

export type TotalesReporteCanasta = {
  prendas: number
  total: number
  abonado: number
  saldo: number
}

export const COLUMNAS_REPORTE_CANASTA = [
  'Código',
  'Nombre',
  'Prendas totales',
  'Última compra',
  'Total',
  'Abonado',
  'Saldo',
] as const

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** Fecha corta con año, en zona Ecuador: 18 nov 2026. */
export function textoFechaReporte(fecha: string): string {
  const dia = fechaDiaLocal(fecha)
  const [anio, mes, numero] = dia.split('-')
  const indice = Number(mes) - 1
  if (!anio || !numero || indice < 0 || indice > 11) return fecha
  return `${Number(numero)} ${MESES[indice]} ${anio}`
}

export function textoPeriodoReporte(rango: RangoFechasReporte | null): string {
  if (!rango) return 'Toda la canasta'
  return `${textoFechaReporte(rango.desde)} – ${textoFechaReporte(rango.hasta)}`
}

function fechaEnRango(fecha: string, rango: RangoFechasReporte): boolean {
  const dia = fechaDiaLocal(fecha)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return false
  const desde = fechaDiaLocal(rango.desde)
  const hasta = fechaDiaLocal(rango.hasta)
  return dia >= desde && dia <= hasta
}

function diasDelPeriodo(dias: GrupoDia[], rango: RangoFechasReporte | null): GrupoDia[] {
  if (!rango) return dias
  return dias.filter((dia) => dia.fecha && fechaEnRango(dia.fecha, rango))
}

/** Arma el reporte de canastas abiertas. Con rango, prendas y total son solo de ese periodo. */
export function armarReporteCanasta(
  canastas: CanastaParaReporte[],
  abonosPorCliente: Record<string, { monto: number }[]>,
  rango: RangoFechasReporte | null = null,
): FilaReporteCanasta[] {
  return canastas.flatMap((canasta) => {
    const dias = diasDelPeriodo(canasta.dias, rango)
    if (rango && dias.length === 0) return []
    const abonos = abonosPorCliente[canasta.clienteId] ?? []
    const ultima = dias.find((dia) => dia.fecha)?.fecha ?? ''
    return [
      {
        codigo: canasta.codigo,
        nombre: canasta.nombre,
        prendas: rango ? dias.reduce((suma, dia) => suma + dia.prendas, 0) : canasta.prendas,
        ultimaCompra: ultima ? textoFechaReporte(ultima) : '',
        total: rango
          ? redondear2(dias.reduce((suma, dia) => suma + redondear2(dia.total), 0))
          : canasta.total,
        abonado: canasta.saldoFavor,
        saldo: canasta.saldo,
        montos: abonos.map((abono) => abono.monto),
        sinAbonos: abonos.length === 0,
      },
    ]
  })
}

/** Suma prendas y montos de las filas ya filtradas por el periodo del reporte. */
export function totalesReporteCanasta(filas: FilaReporteCanasta[]): TotalesReporteCanasta {
  return {
    prendas: filas.reduce((suma, fila) => suma + fila.prendas, 0),
    total: redondear2(filas.reduce((suma, fila) => suma + redondear2(fila.total), 0)),
    abonado: redondear2(filas.reduce((suma, fila) => suma + redondear2(fila.abonado), 0)),
    saldo: redondear2(filas.reduce((suma, fila) => suma + redondear2(fila.saldo), 0)),
  }
}
