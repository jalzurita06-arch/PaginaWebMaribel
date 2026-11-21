import { describe, expect, it } from 'vitest'
import { armarHojaExcel, armarLibroExcel } from './reporteCanastaExcel.ts'

const ana = {
  codigo: 'ANA',
  nombre: 'Ana Pérez',
  prendas: 8,
  ultimaCompra: '18 nov 2026',
  total: 40,
  abonado: 15,
  saldo: 25,
  montos: [10, 5],
  sinAbonos: false,
}

const bel = {
  codigo: 'BEL',
  nombre: null,
  prendas: 2,
  ultimaCompra: '12 oct 2026',
  total: 10,
  abonado: 0,
  saldo: 10,
  montos: [],
  sinAbonos: true,
}

describe('armarHojaExcel', () => {
  it('pone el periodo y las columnas con última compra', () => {
    expect(armarHojaExcel([ana, bel], '1 nov 2026 – 20 nov 2026')).toEqual({
      periodo: '1 nov 2026 – 20 nov 2026',
      encabezados: [
        'Código',
        'Nombre',
        'Prendas totales',
        'Última compra',
        'Total',
        'Abonado',
        'Saldo',
      ],
      filas: [
        ['ANA', 'Ana Pérez', 8, '18 nov 2026', 40, 15, 25],
        ['BEL', '', 2, '12 oct 2026', 10, 0, 10],
      ],
      totales: { prendas: 10, total: 50, abonado: 15, saldo: 35 },
      filaTotales: ['Totales', '', 10, '', 50, 15, 35],
    })
  })
})

describe('armarLibroExcel', () => {
  it('deja el periodo arriba de la tabla y pinta de rojo a quien no tiene abonos', async () => {
    const libro = await armarLibroExcel([ana, bel], 'Toda la canasta')
    const hoja = libro.worksheets[0]
    expect(hoja?.getCell('A1').value).toBe('Toda la canasta')
    expect(hoja?.getTable('TablaCanastas')).toBeTruthy()
    expect(hoja?.getRow(4).getCell(1).fill).toMatchObject({
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3C1C1' },
    })
    expect(hoja?.getRow(3).getCell(1).fill).not.toMatchObject({
      fgColor: { argb: 'FFF3C1C1' },
    })
    expect(hoja?.getCell('C1').value).toMatchObject({
      richText: [{ text: 'Prendas ' }, { text: '10' }],
    })
    expect(hoja?.getRow(5).getCell(1).value).toBe('Totales')
    expect(hoja?.getRow(5).getCell(3).value).toBe(10)
    expect(hoja?.getRow(5).getCell(5).value).toBe(50)
    expect(hoja?.getRow(5).font).toMatchObject({ bold: true })
  })
})
