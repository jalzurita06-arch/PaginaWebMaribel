import { describe, expect, it } from 'vitest'
import { armarReporteCanasta } from './reporteCanasta.ts'

const ana = {
  clienteId: 'a',
  codigo: 'ANA',
  nombre: 'Ana Pérez',
  total: 40,
  saldoFavor: 15,
  saldo: 25,
}

const bel = {
  clienteId: 'b',
  codigo: 'BEL',
  nombre: null,
  total: 10,
  saldoFavor: 0,
  saldo: 10,
}

describe('armarReporteCanasta', () => {
  it('deja solo montos, sin fechas, y marca campana si no hay abonos', () => {
    const abonosAna = [
      { monto: 10, fecha: '2026-10-12' },
      { monto: 5, fecha: '2026-10-01' },
    ]
    expect(armarReporteCanasta([ana, bel], { a: abonosAna })).toEqual([
      {
        codigo: 'ANA',
        nombre: 'Ana Pérez',
        total: 40,
        abonado: 15,
        saldo: 25,
        montos: [10, 5],
        sinAbonos: false,
      },
      {
        codigo: 'BEL',
        nombre: null,
        total: 10,
        abonado: 0,
        saldo: 10,
        montos: [],
        sinAbonos: true,
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
