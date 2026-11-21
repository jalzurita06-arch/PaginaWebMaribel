import { describe, expect, it } from 'vitest'
import {
  armarReporteCanasta,
  textoFechaReporte,
  textoPeriodoReporte,
  type CanastaParaReporte,
} from './reporteCanasta.ts'

const ana: CanastaParaReporte = {
  clienteId: 'a',
  codigo: 'ANA',
  nombre: 'Ana Pérez',
  total: 40,
  saldoFavor: 15,
  saldo: 25,
  prendas: 8,
  dias: [
    { fecha: '2026-11-18', prendas: 3, total: 15, grupos: [] },
    { fecha: '2026-10-01', prendas: 5, total: 25, grupos: [] },
  ],
}

const bel: CanastaParaReporte = {
  clienteId: 'b',
  codigo: 'BEL',
  nombre: null,
  total: 10,
  saldoFavor: 0,
  saldo: 10,
  prendas: 2,
  dias: [{ fecha: '2026-10-12', prendas: 2, total: 10, grupos: [] }],
}

describe('textoFechaReporte', () => {
  it('escribe el día, el mes corto y el año', () => {
    expect(textoFechaReporte('2026-11-18')).toBe('18 nov 2026')
    expect(textoFechaReporte('2026-11-01')).toBe('1 nov 2026')
  })
})

describe('textoPeriodoReporte', () => {
  it('escribe el rango o toda la canasta', () => {
    expect(textoPeriodoReporte(null)).toBe('Toda la canasta')
    expect(textoPeriodoReporte({ desde: '2026-11-01', hasta: '2026-11-20' })).toBe(
      '1 nov 2026 – 20 nov 2026',
    )
  })
})

describe('armarReporteCanasta', () => {
  it('sin rango usa prendas y total de toda la canasta', () => {
    const abonosAna = [
      { monto: 10, fecha: '2026-10-12' },
      { monto: 5, fecha: '2026-10-01' },
    ]
    expect(armarReporteCanasta([ana, bel], { a: abonosAna })).toEqual([
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
    ])
  })

  it('con rango solo incluye clientas con compra en el periodo y suma solo esas prendas', () => {
    const filas = armarReporteCanasta([ana, bel], { a: [{ monto: 15 }] }, {
      desde: '2026-11-01',
      hasta: '2026-11-20',
    })
    expect(filas).toEqual([
      {
        codigo: 'ANA',
        nombre: 'Ana Pérez',
        prendas: 3,
        ultimaCompra: '18 nov 2026',
        total: 15,
        abonado: 15,
        saldo: 25,
        montos: [15],
        sinAbonos: false,
      },
    ])
  })

  it('no marca campana si ya hay abonos, aunque el último sea viejo', () => {
    const abonos = [{ monto: 3, fecha: '2026-01-01' }]
    const filas = armarReporteCanasta([ana], { a: abonos })
    expect(filas[0]?.sinAbonos).toBe(false)
    expect(filas[0]?.montos).toEqual([3])
  })

  it('respeta el orden de las canastas', () => {
    const filas = armarReporteCanasta([bel, ana], { a: [{ monto: 1 }] })
    expect(filas.map((fila) => fila.codigo)).toEqual(['BEL', 'ANA'])
  })
})
