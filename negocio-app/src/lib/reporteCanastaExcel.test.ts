import { describe, expect, it } from 'vitest'
import { armarHojaExcel, armarLibroExcel } from './reporteCanastaExcel.ts'

const ana = {
  codigo: 'ANA',
  nombre: 'Ana Pérez',
  total: 40,
  abonado: 15,
  saldo: 25,
  montos: [10, 5],
  sinAbonos: false,
}

const bel = {
  codigo: 'BEL',
  nombre: null,
  total: 10,
  abonado: 0,
  saldo: 10,
  montos: [],
  sinAbonos: true,
}

describe('armarHojaExcel', () => {
  it('deja solo código, nombre y totales, sin historial de abonos', () => {
    expect(armarHojaExcel([ana, bel])).toEqual({
      encabezados: ['Código', 'Nombre', 'Total', 'Abonado', 'Saldo'],
      filas: [
        ['ANA', 'Ana Pérez', 40, 15, 25],
        ['BEL', '', 10, 0, 10],
      ],
    })
  })
})

describe('armarLibroExcel', () => {
  it('crea una tabla con filtro y pinta de rojo a quien no tiene abonos', async () => {
    const libro = await armarLibroExcel([ana, bel])
    const hoja = libro.worksheets[0]
    expect(hoja?.getTable('TablaCanastas')).toBeTruthy()
    expect(hoja?.getRow(3).getCell(1).fill).toMatchObject({
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3C1C1' },
    })
    expect(hoja?.getRow(2).getCell(1).fill).not.toMatchObject({
      fgColor: { argb: 'FFF3C1C1' },
    })
  })
})
