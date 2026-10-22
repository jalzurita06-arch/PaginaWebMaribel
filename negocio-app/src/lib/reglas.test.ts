import { describe, expect, it } from 'vitest'
import {
  agruparPorDia,
  agruparPorPrecio,
  calcularEnvio,
  excedenteAbono,
  fechaDiaLocal,
  mensajeAbonoRegistrado,
  ordenarCanastasAbiertas,
  ordenarClientesPorEstado,
  ordenarPorCanasta,
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

describe('fechaDiaLocal', () => {
  it('deja una fecha YYYY-MM-DD igual', () => {
    expect(fechaDiaLocal('2026-10-15')).toBe('2026-10-15')
  })

  it('pasa el instante a la fecha de Ecuador', () => {
    expect(fechaDiaLocal('2026-10-15T05:24:28.553Z')).toBe('2026-10-15')
    expect(fechaDiaLocal('2026-10-15T04:17:22.099Z')).toBe('2026-10-14')
    expect(fechaDiaLocal('2026-10-15 04:17:22.099128+00')).toBe('2026-10-14')
  })
})

describe('agruparPorDia', () => {
  it('junta el mismo precio del mismo día y deja el día más reciente primero', () => {
    expect(
      agruparPorDia([
        { precio: 5, cantidad: 1, fecha: '2026-10-14' },
        { precio: 9, cantidad: 2, fecha: '2026-10-15' },
        { precio: 5, cantidad: 2, fecha: '2026-10-15' },
        { precio: 5, cantidad: 1, fecha: '2026-10-14' },
      ]),
    ).toEqual([
      {
        fecha: '2026-10-15',
        prendas: 4,
        total: 28,
        grupos: [
          { precio: 9, cantidad: 2, subtotal: 18 },
          { precio: 5, cantidad: 2, subtotal: 10 },
        ],
      },
      {
        fecha: '2026-10-14',
        prendas: 2,
        total: 10,
        grupos: [{ precio: 5, cantidad: 2, subtotal: 10 }],
      },
    ])
  })

  it('deja al final las prendas sin fecha válida', () => {
    expect(
      agruparPorDia([
        { precio: 5, cantidad: 1, fecha: '' },
        { precio: 5, cantidad: 1, fecha: 'no' },
        { precio: 8, cantidad: 1, fecha: '2026-10-15' },
        { precio: 5, cantidad: 0, fecha: '2026-10-15' },
      ]),
    ).toEqual([
      {
        fecha: '2026-10-15',
        prendas: 1,
        total: 8,
        grupos: [{ precio: 8, cantidad: 1, subtotal: 8 }],
      },
      {
        fecha: '',
        prendas: 2,
        total: 10,
        grupos: [{ precio: 5, cantidad: 2, subtotal: 10 }],
      },
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

  it('resta el monto entero al borrar un abono', () => {
    expect(saldoTrasEditarAbono(10, 5, 0)).toBe(5)
    expect(saldoTrasEditarAbono(5, 5, 0)).toBe(0)
    expect(saldoTrasEditarAbono(3, 5, 0)).toBeNull()
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

describe('ordenarPorCanasta', () => {
  it('ordena alfabéticamente por código', () => {
    expect(
      ordenarPorCanasta([
        { codigo: 'B', prendas: 1 },
        { codigo: 'A', prendas: 8 },
        { codigo: 'C', prendas: 5 },
        { codigo: 'D', prendas: 5 },
      ]).map((cliente) => cliente.codigo),
    ).toEqual(['A', 'B', 'C', 'D'])
  })
})

describe('ordenarClientesPorEstado', () => {
  const filas = [
    { codigo: 'Z', estado: 'activo' },
    { codigo: 'A', estado: 'inactivo' },
    { codigo: 'M', estado: 'activo' },
    { codigo: 'B', estado: 'inactivo' },
  ]

  it('pone activos primero y desempata por código', () => {
    expect(ordenarClientesPorEstado(filas, 'activos').map((fila) => fila.codigo)).toEqual([
      'M',
      'Z',
      'A',
      'B',
    ])
  })

  it('pone inactivos primero y desempata por código', () => {
    expect(ordenarClientesPorEstado(filas, 'inactivos').map((fila) => fila.codigo)).toEqual([
      'A',
      'B',
      'M',
      'Z',
    ])
  })
})

describe('ordenarCanastasAbiertas', () => {
  const filas = [
    { codigo: 'Z', saldo: 4 },
    { codigo: 'A', saldo: 20 },
    { codigo: 'M', saldo: 4 },
  ]

  it('ordena por código', () => {
    expect(ordenarCanastasAbiertas(filas, 'codigo').map((fila) => fila.codigo)).toEqual(['A', 'M', 'Z'])
  })

  it('ordena por quien debe más y desempata por código', () => {
    expect(ordenarCanastasAbiertas(filas, 'saldoMayor').map((fila) => fila.codigo)).toEqual(['A', 'M', 'Z'])
  })

  it('ordena por quien debe menos y desempata por código', () => {
    expect(ordenarCanastasAbiertas(filas, 'saldoMenor').map((fila) => fila.codigo)).toEqual(['M', 'Z', 'A'])
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
