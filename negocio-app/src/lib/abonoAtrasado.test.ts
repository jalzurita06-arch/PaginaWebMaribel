import { describe, expect, it } from 'vitest'
import { abonoAtrasado, fechaCorteAbono, organizarAbonosPorCliente, ultimasFechasAbono } from './abonoAtrasado.ts'

const hoy = new Date(2026, 9, 15)

describe('abono atrasado', () => {
  it('marca a quien no tiene abono', () => {
    expect(abonoAtrasado(null, hoy)).toBe(true)
    expect(abonoAtrasado(undefined, hoy)).toBe(true)
  })

  it('marca cuando el último abono ya cumplió 5 días', () => {
    expect(fechaCorteAbono(hoy)).toBe('2026-10-10')
    expect(abonoAtrasado('2026-10-10', hoy)).toBe(true)
    expect(abonoAtrasado('2026-10-09', hoy)).toBe(true)
    expect(abonoAtrasado('2026-10-11', hoy)).toBe(false)
    expect(abonoAtrasado('2026-10-15', hoy)).toBe(false)
  })

  it('cruza de mes', () => {
    expect(fechaCorteAbono(new Date(2026, 2, 2))).toBe('2026-02-25')
    expect(abonoAtrasado('2026-02-25', new Date(2026, 2, 2))).toBe(true)
    expect(abonoAtrasado('2026-02-26', new Date(2026, 2, 2))).toBe(false)
  })

  it('se queda con la fecha más reciente de cada clienta', () => {
    expect(
      ultimasFechasAbono([
        { clienteId: 'a', fecha: '2026-10-01' },
        { clienteId: 'a', fecha: '2026-10-12T08:00:00' },
        { clienteId: 'b', fecha: '2026-09-01' },
      ]),
    ).toEqual({ a: '2026-10-12', b: '2026-09-01' })
  })
})

describe('organizarAbonosPorCliente', () => {
  it('agrupa por clienta y deja el abono más reciente primero', () => {
    expect(
      organizarAbonosPorCliente([
        { clienteId: 'b', fecha: '2026-10-01', monto: 5 },
        { clienteId: 'a', fecha: '2026-10-01', monto: 10 },
        { clienteId: 'a', fecha: '2026-10-12', monto: 15 },
      ]),
    ).toEqual({
      b: [{ clienteId: 'b', fecha: '2026-10-01', monto: 5 }],
      a: [
        { clienteId: 'a', fecha: '2026-10-12', monto: 15 },
        { clienteId: 'a', fecha: '2026-10-01', monto: 10 },
      ],
    })
  })
})
