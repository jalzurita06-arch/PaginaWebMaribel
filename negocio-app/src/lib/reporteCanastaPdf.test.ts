import { describe, expect, it } from 'vitest'
import { COLUMNAS_REPORTE_CANASTA, textoPeriodoReporte, totalesReporteCanasta } from './reporteCanasta.ts'

describe('reporte PDF de canastas', () => {
  it('usa las mismas columnas y el periodo bajo el título', () => {
    expect([...COLUMNAS_REPORTE_CANASTA]).toEqual([
      'Código',
      'Nombre',
      'Prendas totales',
      'Última compra',
      'Total',
      'Abonado',
      'Saldo',
    ])
    expect(textoPeriodoReporte({ desde: '2026-11-01', hasta: '2026-11-20' })).toBe(
      '1 nov 2026 – 20 nov 2026',
    )
    expect(textoPeriodoReporte(null)).toBe('Toda la canasta')
  })

  it('lleva los mismos totales que el resto del reporte', () => {
    expect(
      totalesReporteCanasta([
        {
          codigo: 'ANA',
          nombre: 'Ana Pérez',
          prendas: 8,
          ultimaCompra: '18 nov 2026',
          total: 40,
          abonado: 15,
          saldo: 25,
          montos: [10, 5],
          sinAbonos: false,
        },
        {
          codigo: 'BEL',
          nombre: null,
          prendas: 2,
          ultimaCompra: '12 oct 2026',
          total: 10,
          abonado: 0,
          saldo: 10,
          montos: [],
          sinAbonos: true,
        },
      ]),
    ).toEqual({ prendas: 10, total: 50, abonado: 15, saldo: 35 })
  })
})
