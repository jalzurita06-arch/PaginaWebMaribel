import { describe, expect, it } from 'vitest'
import { COLUMNAS_REPORTE_CANASTA, textoPeriodoReporte } from './reporteCanasta.ts'

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
})
