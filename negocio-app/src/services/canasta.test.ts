import { describe, expect, it } from 'vitest'
import {
  leerCantidadEntera,
  mensajeErrorCanasta,
  prepararItemsCanasta,
  textoCantidadEntera,
} from './canasta.ts'

describe('textoCantidadEntera', () => {
  it('se queda con el entero y descarta decimales, signos y ceros', () => {
    expect(textoCantidadEntera('12')).toBe('12')
    expect(textoCantidadEntera('1.5')).toBe('1')
    expect(textoCantidadEntera('1,5')).toBe('1')
    expect(textoCantidadEntera('01')).toBe('1')
    expect(textoCantidadEntera('0')).toBe('')
    expect(textoCantidadEntera('-3')).toBe('3')
  })
})

describe('leerCantidadEntera', () => {
  it('acepta un entero mayor que 0', () => {
    expect(leerCantidadEntera('2')).toBe(2)
    expect(leerCantidadEntera(' 3 ')).toBe(3)
  })

  it('rechaza vacío, cero, decimales y negativos', () => {
    expect(leerCantidadEntera('')).toBeNull()
    expect(leerCantidadEntera('0')).toBeNull()
    expect(leerCantidadEntera('1.5')).toBeNull()
    expect(leerCantidadEntera('-1')).toBeNull()
    expect(leerCantidadEntera('01')).toBeNull()
  })
})

describe('prepararItemsCanasta', () => {
  it('redondea el precio y conserva la cantidad', () => {
    expect(prepararItemsCanasta([{ precio: 3.5, cantidad: 2 }])).toEqual({
      ok: true,
      datos: [{ precio: 3.5, cantidad: 2 }],
    })
  })

  it('exige al menos una prenda, precio mayor que 0 y cantidad entera', () => {
    expect(prepararItemsCanasta([])).toEqual({
      ok: false,
      mensaje: 'Agrega al menos una prenda.',
    })
    expect(prepararItemsCanasta([{ precio: 0, cantidad: 1 }]).ok).toBe(false)
    expect(prepararItemsCanasta([{ precio: 5, cantidad: 1.5 }])).toEqual({
      ok: false,
      mensaje: 'La cantidad debe ser un entero mayor que 0.',
    })
  })
})

describe('mensajeErrorCanasta', () => {
  it('traduce la falta de conexión y una sesión vencida', () => {
    expect(mensajeErrorCanasta(new Error('Failed to fetch'), 'guardar el pedido')).toBe(
      'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
    )
    expect(mensajeErrorCanasta({ code: '42501', message: 'permission denied' }, 'guardar el pedido')).toBe(
      'La sesión expiró. Vuelve a entrar.',
    )
  })

  it('usa la acción cuando el error no se reconoce', () => {
    expect(mensajeErrorCanasta({ code: 'XX000', message: 'otro' }, 'guardar el pedido')).toBe(
      'No se pudo guardar el pedido. Inténtalo de nuevo.',
    )
  })
})
