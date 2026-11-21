import { formatearDolares } from './dinero.ts'
import {
  COLUMNAS_REPORTE_CANASTA,
  totalesReporteCanasta,
  type FilaReporteCanasta,
  type TotalesReporteCanasta,
} from './reporteCanasta.ts'

const COLOR_ALERTA = { r: 193, g: 20, b: 46 }
const MARGEN = 14
const CAMPANA = 4.6
const ALTO_FILA = 7
const ALTO_NOMBRE = 4.2
const COL_CODIGO = 22
const COL_PRENDAS = 20
const COL_FECHA = 24
const COL_CIFRA = 22
const OPACIDAD_LINEA = 0.28

type Documento = import('jspdf').jsPDF
type ClaseEstado = typeof import('jspdf').GState

export async function descargarReporteCanastas(filas: FilaReporteCanasta[], periodo: string) {
  const { jsPDF, GState } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'letter' })
  const ancho = doc.internal.pageSize.getWidth()
  const alto = doc.internal.pageSize.getHeight()
  const limite = alto - MARGEN
  const anchoUtil = ancho - MARGEN * 2
  const colNombre = anchoUtil - COL_CODIGO - COL_PRENDAS - COL_FECHA - COL_CIFRA * 3
  const xCifras = [
    MARGEN + COL_CODIGO + colNombre,
    MARGEN + COL_CODIGO + colNombre + COL_PRENDAS,
    MARGEN + COL_CODIGO + colNombre + COL_PRENDAS + COL_FECHA,
    MARGEN + COL_CODIGO + colNombre + COL_PRENDAS + COL_FECHA + COL_CIFRA,
    MARGEN + COL_CODIGO + colNombre + COL_PRENDAS + COL_FECHA + COL_CIFRA * 2,
  ]
  let y = MARGEN
  const totales = totalesReporteCanasta(filas)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)
  doc.text('Canastas abiertas', MARGEN, y)
  const yResumen = dibujarResumenTotales(doc, totales, ancho - MARGEN, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(120, 120, 120)
  doc.text(periodo, MARGEN, y)
  y = Math.max(y + 8, yResumen + 5)
  y = dibujarEncabezado(doc, y, xCifras, colNombre, GState)

  for (const fila of filas) {
    const lineasNombre = lineasDeNombre(doc, fila.nombre, colNombre)
    const extraNombre = Math.max(0, lineasNombre.length - 1) * ALTO_NOMBRE
    const altoFila = ALTO_FILA + extraNombre
    if (y > MARGEN + 10 && y + altoFila > limite) {
      doc.addPage()
      y = MARGEN
      y = dibujarEncabezado(doc, y, xCifras, colNombre, GState)
    }
    dibujarFila(doc, fila, y, xCifras, lineasNombre)
    dibujarLineaFila(doc, y + 3.2 + extraNombre, anchoUtil, GState)
    y += altoFila
  }

  if (y > MARGEN + 10 && y + ALTO_FILA > limite) {
    doc.addPage()
    y = MARGEN
    y = dibujarEncabezado(doc, y, xCifras, colNombre, GState)
  }
  dibujarFilaTotales(doc, totales, y, xCifras, anchoUtil, GState)

  doc.save('canastas-abiertas.pdf')
}

function dibujarEncabezado(
  doc: Documento,
  y: number,
  xCifras: number[],
  colNombre: number,
  Estado: ClaseEstado,
): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80)
  doc.text(COLUMNAS_REPORTE_CANASTA[0], MARGEN, y)
  doc.text(COLUMNAS_REPORTE_CANASTA[1], MARGEN + COL_CODIGO, y)
  doc.text(COLUMNAS_REPORTE_CANASTA[2], xCifras[0]! + COL_PRENDAS, y, { align: 'right' })
  doc.text(COLUMNAS_REPORTE_CANASTA[3], xCifras[1]! + COL_FECHA, y, { align: 'right' })
  doc.text(COLUMNAS_REPORTE_CANASTA[4], xCifras[2]! + COL_CIFRA, y, { align: 'right' })
  doc.text(COLUMNAS_REPORTE_CANASTA[5], xCifras[3]! + COL_CIFRA, y, { align: 'right' })
  doc.text(COLUMNAS_REPORTE_CANASTA[6], xCifras[4]! + COL_CIFRA, y, { align: 'right' })
  y += 2.2
  dibujarLineaFila(doc, y, COL_CODIGO + colNombre + COL_PRENDAS + COL_FECHA + COL_CIFRA * 3, Estado)
  doc.setTextColor(0, 0, 0)
  return y + 4.2
}

function dibujarResumenTotales(
  doc: Documento,
  totales: TotalesReporteCanasta,
  xDerecha: number,
  y: number,
): number {
  const lineas: [string, string][] = [
    ['Prendas', String(totales.prendas)],
    ['Total', formatearDolares(totales.total)],
    ['Abonado', formatearDolares(totales.abonado)],
    ['Saldo', formatearDolares(totales.saldo)],
  ]
  const alto = 4
  lineas.forEach(([etiqueta, valor], indice) => {
    const yy = y + indice * alto
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    doc.text(valor, xDerecha, yy, { align: 'right' })
    const anchoValor = doc.getTextWidth(valor)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 120, 120)
    doc.text(`${etiqueta}  `, xDerecha - anchoValor, yy, { align: 'right' })
  })
  return y + (lineas.length - 1) * alto
}

function dibujarFilaTotales(
  doc: Documento,
  totales: TotalesReporteCanasta,
  y: number,
  xCifras: number[],
  anchoUtil: number,
  Estado: ClaseEstado,
) {
  dibujarLineaFila(doc, y - 3.2, anchoUtil, Estado)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0)
  doc.text('Totales', MARGEN, y)
  doc.setFontSize(10)
  doc.text(String(totales.prendas), xCifras[0]! + COL_PRENDAS, y, { align: 'right' })
  doc.text(formatearDolares(totales.total), xCifras[2]! + COL_CIFRA, y, { align: 'right' })
  doc.text(formatearDolares(totales.abonado), xCifras[3]! + COL_CIFRA, y, { align: 'right' })
  doc.text(formatearDolares(totales.saldo), xCifras[4]! + COL_CIFRA, y, { align: 'right' })
}

function dibujarFila(
  doc: Documento,
  fila: FilaReporteCanasta,
  y: number,
  xCifras: number[],
  lineasNombre: string[],
) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  const codigo = fila.codigo.toUpperCase()
  doc.text(codigo, MARGEN, y)

  if (fila.sinAbonos) {
    const anchoCodigo = doc.getTextWidth(codigo)
    dibujarCampanaRoja(
      doc,
      MARGEN + Math.min(anchoCodigo + CAMPANA / 2 + 1.4, COL_CODIGO - CAMPANA / 2 - 0.4),
      y - 1.2,
    )
  }

  if (lineasNombre.length > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(lineasNombre, MARGEN + COL_CODIGO, y)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(String(fila.prendas), xCifras[0]! + COL_PRENDAS, y, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.text(fila.ultimaCompra, xCifras[1]! + COL_FECHA, y, { align: 'right' })
  doc.setFont('helvetica', 'bold')
  doc.text(formatearDolares(fila.total), xCifras[2]! + COL_CIFRA, y, { align: 'right' })
  doc.text(formatearDolares(fila.abonado), xCifras[3]! + COL_CIFRA, y, { align: 'right' })
  doc.text(formatearDolares(fila.saldo), xCifras[4]! + COL_CIFRA, y, { align: 'right' })
}

function dibujarLineaFila(doc: Documento, y: number, anchoUtil: number, Estado: ClaseEstado) {
  doc.saveGraphicsState()
  doc.setGState(new Estado({ opacity: OPACIDAD_LINEA, 'stroke-opacity': OPACIDAD_LINEA }))
  doc.setDrawColor(90, 90, 90)
  doc.setLineWidth(0.2)
  doc.line(MARGEN, y, MARGEN + anchoUtil, y)
  doc.restoreGraphicsState()
}

function lineasDeNombre(doc: Documento, nombre: string | null, colNombre: number): string[] {
  if (!nombre) return []
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  return doc.splitTextToSize(nombre, colNombre - 2)
}

/** Círculo alerta #c1142e con campana blanca, como CampanaAbono. */
function dibujarCampanaRoja(doc: Documento, cx: number, cy: number) {
  const r = CAMPANA / 2
  doc.setFillColor(COLOR_ALERTA.r, COLOR_ALERTA.g, COLOR_ALERTA.b)
  doc.circle(cx, cy, r, 'F')

  doc.setFillColor(255, 255, 255)
  const ancho = r * 0.42
  const alto = r * 0.55
  doc.roundedRect(cx - ancho, cy - alto, ancho * 2, alto * 1.35, ancho, ancho, 'F')
  doc.triangle(cx - r * 0.62, cy + alto * 0.28, cx + r * 0.62, cy + alto * 0.28, cx, cy + alto * 0.72, 'F')
  doc.circle(cx, cy + r * 0.62, r * 0.14, 'F')
}
