import { describe, expect, it } from 'vitest'
import {
  MENSAJE_CANASTA_VACIA,
  agruparCanastasAbiertas,
  armarRegistroEnvio,
  envioEsAntiguo,
  esTipoEnvio,
  fechaCorteEnvios,
  leerDetalleEnvio,
  mensajeEnvioConfirmado,
  mensajeErrorEnvio,
} from './envios.ts'

describe('fechaCorteEnvios', () => {
  it('conserva el día de hace 7 días y borra lo anterior', () => {
    expect(fechaCorteEnvios(new Date(2026, 9, 14))).toBe('2026-10-07')
    expect(envioEsAntiguo('2026-10-06', new Date(2026, 9, 14))).toBe(true)
    expect(envioEsAntiguo('2026-10-07', new Date(2026, 9, 14))).toBe(false)
    expect(envioEsAntiguo('2026-10-14T15:00:00+00:00', new Date(2026, 9, 14))).toBe(false)
  })

  it('cruza de mes y de año', () => {
    expect(fechaCorteEnvios(new Date(2026, 2, 1))).toBe('2026-02-22')
    expect(fechaCorteEnvios(new Date(2026, 0, 3))).toBe('2025-12-27')
  })
})

describe('armarRegistroEnvio', () => {
  it('no hace nada si la canasta está vacía', () => {
    expect(armarRegistroEnvio([], 10)).toEqual({ ok: false, mensaje: MENSAJE_CANASTA_VACIA })
    expect(armarRegistroEnvio([{ precio: 5, cantidad: 0 }], 10)).toEqual({
      ok: false,
      mensaje: MENSAJE_CANASTA_VACIA,
    })
  })

  it('con abono menor que el total deja saldo 0 e inactiva', () => {
    expect(armarRegistroEnvio([{ precio: 5, cantidad: 4 }], 5)).toEqual({
      ok: true,
      datos: {
        nuevoSaldoFavor: 0,
        nuevoEstado: 'inactivo',
        total: 20,
        prendas: 4,
        detalle: [{ precio: 5, cantidad: 4, subtotal: 20 }],
      },
    })
  })

  it('si el abono alcanza, guarda el sobrante y agrupa el detalle', () => {
    expect(
      armarRegistroEnvio(
        [
          { precio: 5, cantidad: 1 },
          { precio: 9, cantidad: 2 },
          { precio: 5, cantidad: 2 },
        ],
        40,
      ),
    ).toEqual({
      ok: true,
      datos: {
        nuevoSaldoFavor: 7,
        nuevoEstado: 'activo',
        total: 33,
        prendas: 5,
        detalle: [
          { precio: 5, cantidad: 3, subtotal: 15 },
          { precio: 9, cantidad: 2, subtotal: 18 },
        ],
      },
    })
  })
})

describe('agruparCanastasAbiertas', () => {
  it('junta las prendas de cada clienta, calcula saldo y ordena por código', () => {
    expect(
      agruparCanastasAbiertas([
        { clienteId: '2', codigo: 'Z', nombre: 'Zulema', saldoFavor: 5, precio: 9, cantidad: 1 },
        { clienteId: '1', codigo: 'A', nombre: 'Ana', saldoFavor: 10, precio: 5, cantidad: 2 },
        { clienteId: '1', codigo: 'A', nombre: 'Ana', saldoFavor: 10, precio: 5, cantidad: 1 },
        { clienteId: '3', codigo: 'B', nombre: null, saldoFavor: 0, precio: 4, cantidad: 0 },
      ]),
    ).toEqual([
      {
        clienteId: '1',
        codigo: 'A',
        nombre: 'Ana',
        saldoFavor: 10,
        prendas: 3,
        total: 15,
        saldo: 5,
        grupos: [{ precio: 5, cantidad: 3, subtotal: 15 }],
      },
      {
        clienteId: '2',
        codigo: 'Z',
        nombre: 'Zulema',
        saldoFavor: 5,
        prendas: 1,
        total: 9,
        saldo: 4,
        grupos: [{ precio: 9, cantidad: 1, subtotal: 9 }],
      },
    ])
  })
})

describe('leerDetalleEnvio', () => {
  it('lee precio, cantidad y subtotal y ignora filas inválidas', () => {
    expect(
      leerDetalleEnvio([
        { precio: 5, cantidad: 3, subtotal: 15 },
        { precio: 9, cantidad: 0, subtotal: 0 },
        { precio: 'no', cantidad: 2 },
        { precio: 6, cantidad: 2 },
      ]),
    ).toEqual([
      { precio: 5, cantidad: 3, subtotal: 15 },
      { precio: 6, cantidad: 2, subtotal: 12 },
    ])
  })

  it('queda vacío si no hay detalle', () => {
    expect(leerDetalleEnvio(null)).toEqual([])
    expect(leerDetalleEnvio({})).toEqual([])
  })
})

describe('mensajeEnvioConfirmado', () => {
  it('avisa el saldo que queda o que la clienta pasa a inactiva', () => {
    expect(mensajeEnvioConfirmado(5)).toBe('Enviado. Queda $5.00 a favor para su próxima compra.')
    expect(mensajeEnvioConfirmado(0)).toBe('Enviado. La clienta queda inactiva.')
  })
})

describe('esTipoEnvio', () => {
  it('acepta local, uber y servientrega', () => {
    expect(esTipoEnvio('local')).toBe(true)
    expect(esTipoEnvio('uber')).toBe(true)
    expect(esTipoEnvio('servientrega')).toBe(true)
    expect(esTipoEnvio('correo')).toBe(false)
  })
})

describe('mensajeErrorEnvio', () => {
  it('traduce la falta de conexión y una sesión vencida', () => {
    expect(mensajeErrorEnvio(new Error('Failed to fetch'), 'registrar el envío')).toBe(
      'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
    )
    expect(mensajeErrorEnvio({ code: '42501', message: 'permission denied' }, 'registrar el envío')).toBe(
      'La sesión expiró. Vuelve a entrar.',
    )
  })
})
