import type ExcelJS from 'exceljs'
import { formatearDolares, redondear2 } from './dinero.ts'
import {
  COLUMNAS_REPORTE_CANASTA,
  totalesReporteCanasta,
  type FilaReporteCanasta,
  type TotalesReporteCanasta,
} from './reporteCanasta.ts'

const COLOR_PELIGRO = 'FFF3C1C1'

export type HojaReporteCanasta = {
  periodo: string
  encabezados: string[]
  filas: (string | number)[][]
  totales: TotalesReporteCanasta
  filaTotales: (string | number)[]
}

/** Hoja compacta: periodo arriba y luego código, nombre, prendas, última compra y montos. */
export function armarHojaExcel(filas: FilaReporteCanasta[], periodo: string): HojaReporteCanasta {
  const totales = totalesReporteCanasta(filas)
  return {
    periodo,
    encabezados: [...COLUMNAS_REPORTE_CANASTA],
    filas: filas.map((fila) => [
      fila.codigo,
      fila.nombre ?? '',
      fila.prendas,
      fila.ultimaCompra,
      redondear2(fila.total),
      redondear2(fila.abonado),
      redondear2(fila.saldo),
    ]),
    totales,
    filaTotales: ['Totales', '', totales.prendas, '', totales.total, totales.abonado, totales.saldo],
  }
}

export async function descargarReporteExcel(filas: FilaReporteCanasta[], periodo: string) {
  const libro = await armarLibroExcel(filas, periodo)
  const buffer = await libro.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = 'canastas-abiertas.xlsx'
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export async function armarLibroExcel(
  filas: FilaReporteCanasta[],
  periodo: string,
): Promise<ExcelJS.Workbook> {
  const ExcelJS = (await import('exceljs')).default
  const libro = new ExcelJS.Workbook()
  const hoja = libro.addWorksheet('Canastas abiertas')
  const datos = armarHojaExcel(filas, periodo)

  hoja.getCell('A1').value = datos.periodo
  hoja.getCell('A1').font = { italic: true, size: 11, color: { argb: 'FF787878' } }
  ponerTotalesCabecera(hoja, datos.totales)

  hoja.addTable({
    name: 'TablaCanastas',
    ref: 'A2',
    headerRow: true,
    totalsRow: false,
    style: {
      theme: 'TableStyleMedium2',
      showRowStripes: false,
    },
    columns: datos.encabezados.map((nombre) => ({ name: nombre, filterButton: true })),
    rows: datos.filas,
  })

  hoja.getColumn(1).width = 12
  hoja.getColumn(2).width = 32
  hoja.getColumn(3).width = 16
  hoja.getColumn(4).width = 16
  hoja.getColumn(5).width = 14
  hoja.getColumn(6).width = 14
  hoja.getColumn(7).width = 14

  filas.forEach((fila, indice) => {
    const row = hoja.getRow(indice + 3)
    for (let col = 1; col <= 7; col++) {
      const celda = row.getCell(col)
      if (col >= 5) celda.numFmt = '"$"#,##0.00'
      if (fila.sinAbonos) {
        celda.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLOR_PELIGRO },
        }
      }
    }
  })

  const filaTotales = hoja.getRow(filas.length + 3)
  datos.filaTotales.forEach((valor, indice) => {
    filaTotales.getCell(indice + 1).value = valor
  })
  filaTotales.font = { bold: true }
  filaTotales.getCell(1).border = { top: { style: 'thin', color: { argb: 'FF909090' } } }
  filaTotales.getCell(3).border = { top: { style: 'thin', color: { argb: 'FF909090' } } }
  for (let col = 5; col <= 7; col++) {
    const celda = filaTotales.getCell(col)
    celda.numFmt = '"$"#,##0.00'
    celda.border = { top: { style: 'thin', color: { argb: 'FF909090' } } }
  }

  hoja.views = [{ state: 'frozen', ySplit: 2 }]
  return libro
}

function ponerTotalesCabecera(hoja: ExcelJS.Worksheet, totales: TotalesReporteCanasta) {
  const celdas: [string, string, string][] = [
    ['C1', 'Prendas', String(totales.prendas)],
    ['E1', 'Total', formatearDolares(totales.total)],
    ['F1', 'Abonado', formatearDolares(totales.abonado)],
    ['G1', 'Saldo', formatearDolares(totales.saldo)],
  ]
  for (const [celda, etiqueta, valor] of celdas) {
    hoja.getCell(celda).value = {
      richText: [
        { font: { italic: true, size: 9, color: { argb: 'FF787878' } }, text: `${etiqueta} ` },
        { font: { bold: true, size: 9, color: { argb: 'FF000000' } }, text: valor },
      ],
    }
  }
}
