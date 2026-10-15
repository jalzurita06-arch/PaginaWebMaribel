import { describe, expect, it } from 'vitest'
import {
  agruparPorPrecio,
  calcularEnvio,
  excedenteAbono,
  mensajeAbonoRegistrado,
  ordenarClientesVenta,
  saldoPendiente,
  saldoTrasEditarAbono,
  sumarAbono,
  totalCanasta,
  totalesCanastasAbiertas,
  totalesSemana,
} from './reglas.ts'

describe('reglas de la canasta', () => {
  it('deja el total en 0 cuando la canasta está vacía', () => {
    expect(totalCanasta([])).toBe(0)
  })

  it('con abono 0 y total 20 deja saldo 20 y, al enviar, saldo 0 inactivo', () => {
    expect(saldoPendiente(20, 0)).toBe(20)
    expect(calcularEnvio(20, 0)).toEqual({
      nuevoSaldoFavor: 0,
      nuevoEstado: 'inactivo',
    })
  })

  it('con abono 5 y total 20 deja saldo 15 y, al enviar, saldo 0 inactivo', () => {
    expect(saldoPendiente(20, 5)).toBe(15)
    expect(calcularEnvio(20, 5)).toEqual({
      nuevoSaldoFavor: 0,
      nuevoEstado: 'inactivo',
    })
  })

  it('con abono exacto de 20 y total 20 deja saldo 0 y, al enviar, saldo 0 inactivo', () => {
    expect(saldoPendiente(20, 20)).toBe(0)
    expect(calcularEnvio(20, 20)).toEqual({
      nuevoSaldoFavor: 0,
      nuevoEstado: 'inactivo',
    })
  })

  it('con abono 25 y total 20 deja saldo 0 y, al enviar, saldo 5 activo', () => {
    expect(saldoPendiente(20, 25)).toBe(0)
    expect(calcularEnvio(20, 25)).toEqual({
      nuevoSaldoFavor: 5,
      nuevoEstado: 'activo',
    })
  })

  it('suma 3.50 y 7.5 y da 11, sin error de punto flotante', () => {
    expect(
      totalCanasta([
        { precio: 3.5, cantidad: 1 },
        { precio: 7.5, cantidad: 1 },
      ]),
    ).toBe(11)
  })

  it('agrupa 3 prendas de 5 y 2 de 9 en dos grupos con subtotal', () => {
    expect(
      agruparPorPrecio([
        { precio: 5, cantidad: 1 },
        { precio: 9, cantidad: 2 },
        { precio: 5, cantidad: 2 },
      ]),
    ).toEqual([
      { precio: 5, cantidad: 3, subtotal: 15 },
      { precio: 9, cantidad: 2, subtotal: 18 },
    ])
  })
})

describe('saldoTrasEditarAbono', () => {
  it('suma la diferencia si el monto nuevo es mayor', () => {
    expect(saldoTrasEditarAbono(10, 5, 8)).toBe(13)
  })

  it('resta la diferencia si el monto nuevo es menor y el saldo alcanza', () => {
    expect(saldoTrasEditarAbono(10, 5, 2)).toBe(7)
    expect(saldoTrasEditarAbono(10, 5, 5)).toBe(10)
  })

  it('no deja el saldo en negativo', () => {
    expect(saldoTrasEditarAbono(3, 5, 1)).toBeNull()
    expect(saldoTrasEditarAbono(0, 4, 1)).toBeNull()
  })

  it('redondea la corrección a centavos', () => {
    expect(saldoTrasEditarAbono(0.1, 0.2, 0.3)).toBe(0.2)
  })
})

describe('sumarAbono', () => {
  it('suma el monto al saldo y redondea a centavos', () => {
    expect(sumarAbono(10, 5.5)).toBe(15.5)
    expect(sumarAbono(0.1, 0.2)).toBe(0.3)
  })

  it('no deja el saldo en negativo ni resta si el monto viene negativo', () => {
    expect(sumarAbono(-4, 3)).toBe(3)
    expect(sumarAbono(10, -2)).toBe(10)
    expect(sumarAbono(0, 0)).toBe(0)
  })
})

describe('excedenteAbono', () => {
  it('deja el sobrante cuando el abono pasa el saldo pendiente', () => {
    expect(excedenteAbono(20, 0, 25)).toBe(5)
    expect(excedenteAbono(20, 5, 16)).toBe(1)
    expect(excedenteAbono(0, 0, 10)).toBe(10)
    expect(excedenteAbono(20, 25, 10)).toBe(10)
  })

  it('no marca sobrante si el abono cubre justo lo pendiente o menos', () => {
    expect(excedenteAbono(20, 5, 15)).toBe(0)
    expect(excedenteAbono(20, 0, 10)).toBe(0)
    expect(excedenteAbono(10.1, 0.1, 10)).toBe(0)
  })

  it('redondea el sobrante a centavos', () => {
    expect(excedenteAbono(10.1, 0, 10.2)).toBe(0.1)
  })
})

describe('mensajeAbonoRegistrado', () => {
  it('avisa el dinero que queda a favor cuando el abono se pasa', () => {
    expect(mensajeAbonoRegistrado(5, false)).toBe(
      'Queda $5.00 a favor para su próxima compra.',
    )
  })

  it('confirma el abono cuando no sobra dinero', () => {
    expect(mensajeAbonoRegistrado(0, false)).toBe('Abono agregado.')
  })

  it('agrega que el cliente volvió a estar activo', () => {
    expect(mensajeAbonoRegistrado(5, true)).toBe(
      'Queda $5.00 a favor para su próxima compra. El cliente volvió a estar activo.',
    )
    expect(mensajeAbonoRegistrado(0, true)).toBe(
      'Abono agregado. El cliente volvió a estar activo.',
    )
  })
})

describe('ordenarClientesVenta', () => {
  it('deja activas primero y ordena por más prendas pedidas', () => {
    expect(
      ordenarClientesVenta([
        { codigo: 'B', estado: 'activo', prendas: 1 },
        { codigo: 'A', estado: 'inactivo', prendas: 8 },
        { codigo: 'C', estado: 'activo', prendas: 5 },
        { codigo: 'D', estado: 'activo', prendas: 5 },
      ]).map((cliente) => cliente.codigo),
    ).toEqual(['C', 'D', 'B', 'A'])
  })
})

describe('totalesSemana', () => {
  it('suma el total generado y las prendas', () => {
    expect(
      totalesSemana([
        { total: 10.1, prendas: 2 },
        { total: 0.2, prendas: 1 },
      ]),
    ).toEqual({ total: 10.3, prendas: 3 })
  })

  it('queda en cero cuando no hay envíos', () => {
    expect(totalesSemana([])).toEqual({ total: 0, prendas: 0 })
  })
})

describe('totalesCanastasAbiertas', () => {
  it('suma el total, el saldo y las prendas de las canastas abiertas', () => {
    expect(
      totalesCanastasAbiertas([
        { total: 10.1, saldo: 5.05, prendas: 2 },
        { total: 0.2, saldo: 0.2, prendas: 1 },
      ]),
    ).toEqual({ total: 10.3, saldo: 5.25, prendas: 3 })
  })

  it('queda en cero cuando no hay canastas abiertas', () => {
    expect(totalesCanastasAbiertas([])).toEqual({ total: 0, saldo: 0, prendas: 0 })
  })
})
