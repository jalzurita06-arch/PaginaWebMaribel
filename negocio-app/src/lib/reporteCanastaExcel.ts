import type ExcelJS from 'exceljs'
import { redondear2 } from './dinero.ts'
import type { FilaReporteCanasta } from './reporteCanasta.ts'

const COLOR_PELIGRO = 'FFF3C1C1'

export type HojaReporteCanasta = {
  encabezados: string[]
  filas: (string | number)[][]
}

/** Hoja compacta: código, nombre, total, abonado y saldo. Sin historial de abonos. */
export function armarHojaExcel(filas: FilaReporteCanasta[]): HojaReporteCanasta {
  return {
    encabezados: ['Código', 'Nombre', 'Total', 'Abonado', 'Saldo'],
    filas: filas.map((fila) => [
      fila.codigo,
      fila.nombre ?? '',
      redondear2(fila.total),
      redondear2(fila.abonado),
      redondear2(fila.saldo),
    ]),
  }
}

export async function descargarReporteExcel(filas: FilaReporteCanasta[]) {
  const libro = await armarLibroExcel(filas)
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

export async function armarLibroExcel(filas: FilaReporteCanasta[]): Promise<ExcelJS.Workbook> {
  const ExcelJS = (await import('exceljs')).default
  const libro = new ExcelJS.Workbook()
  const hoja = libro.addWorksheet('Canastas abiertas')
  const datos = armarHojaExcel(filas)

  hoja.addTable({
    name: 'TablaCanastas',
    ref: 'A1',
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
  hoja.getColumn(3).width = 14
  hoja.getColumn(4).width = 14
  hoja.getColumn(5).width = 14

  filas.forEach((fila, indice) => {
    const row = hoja.getRow(indice + 2)
    for (let col = 1; col <= 5; col++) {
      const celda = row.getCell(col)
      if (col >= 3) celda.numFmt = '"$"#,##0.00'
      if (fila.sinAbonos) {
        celda.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLOR_PELIGRO },
        }
      }
    }
  })

  hoja.views = [{ state: 'frozen', ySplit: 1 }]
  return libro
}
