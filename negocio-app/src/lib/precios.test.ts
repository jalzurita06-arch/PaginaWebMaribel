import { describe, expect, it } from 'vitest'
import {
  VALORES_EJEMPLO,
  cambiosDeOrden,
  siguienteOrden,
  validarValorPrecio,
} from './precios.ts'

const lista = [
  { id: 'a', orden: 1 },
  { id: 'b', orden: 2 },
  { id: 'c', orden: 3 },
]

describe('validarValorPrecio', () => {
  it('acepta un monto con hasta 2 decimales', () => {
    expect(validarValorPrecio('3.50', [])).toBeNull()
    expect(validarValorPrecio('7,5', [])).toBeNull()
    expect(validarValorPrecio(' 5 ', [])).toBeNull()
  })

  it('rechaza vacío, cero, negativo y más de 2 decimales', () => {
    expect(validarValorPrecio('  ', [])).toBe('Escribe un valor.')
    expect(validarValorPrecio('0', [])).toBe('El valor debe ser mayor que 0.')
    expect(validarValorPrecio('0.00', [])).toBe('El valor debe ser mayor que 0.')
    expect(validarValorPrecio('-1', [])).toBe('El valor debe ser mayor que 0.')
    expect(validarValorPrecio('3.555', [])).toBe('Escribe un monto válido. Usa hasta 2 decimales.')
    expect(validarValorPrecio('abc', [])).toBe('Escribe un monto válido. Usa hasta 2 decimales.')
  })

  it('rechaza un valor repetido aunque venga con otro formato', () => {
    expect(validarValorPrecio('5.00', [5])).toBe('Ese valor ya está en el catálogo.')
    expect(validarValorPrecio('7,50', [7.5])).toBe('Ese valor ya está en el catálogo.')
    expect(validarValorPrecio('6', [5, 7.5])).toBeNull()
  })
})

describe('valores de ejemplo', () => {
  it('trae los ocho montos del catálogo, sin repetidos', () => {
    expect([...VALORES_EJEMPLO]).toEqual([3.5, 5, 6, 7, 7.5, 8, 10, 12])
    for (const valor of VALORES_EJEMPLO) {
      const otros = VALORES_EJEMPLO.filter((item) => item !== valor)
      expect(validarValorPrecio(String(valor), [...otros])).toBeNull()
    }
  })
})

describe('orden del catálogo', () => {
  it('empieza en 1 cuando no hay valores', () => {
    expect(siguienteOrden([])).toBe(1)
    expect(siguienteOrden([1, 4])).toBe(5)
  })

  it('subir intercambia el orden con el de arriba', () => {
    expect(cambiosDeOrden(lista, 'b', 'subir')).toEqual({
      ok: true,
      cambios: [
        { id: 'b', orden: 1 },
        { id: 'a', orden: 2 },
      ],
    })
  })

  it('bajar intercambia el orden con el de abajo', () => {
    expect(cambiosDeOrden(lista, 'b', 'bajar')).toEqual({
      ok: true,
      cambios: [
        { id: 'b', orden: 3 },
        { id: 'c', orden: 2 },
      ],
    })
  })

  it('no mueve el primero hacia arriba ni el último hacia abajo', () => {
    expect(cambiosDeOrden(lista, 'a', 'subir')).toEqual({ ok: false, motivo: 'borde' })
    expect(cambiosDeOrden(lista, 'c', 'bajar')).toEqual({ ok: false, motivo: 'borde' })
  })

  it('avisa si el valor ya no está', () => {
    expect(cambiosDeOrden(lista, 'z', 'subir')).toEqual({ ok: false, motivo: 'no-encontrado' })
  })

  it('separa dos valores que tenían el mismo orden', () => {
    expect(
      cambiosDeOrden(
        [
          { id: 'a', orden: 1 },
          { id: 'b', orden: 1 },
        ],
        'b',
        'subir',
      ),
    ).toEqual({
      ok: true,
      cambios: [{ id: 'a', orden: 2 }],
    })
  })
})
