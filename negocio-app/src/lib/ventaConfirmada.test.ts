import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { borrarMenuVenta, guardarMenuVenta, leerMenuVenta } from './ventaConfirmada.ts'

const memoria = new Map<string, string>()

beforeEach(() => {
  memoria.clear()
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: {
      getItem: (clave: string) => memoria.get(clave) ?? null,
      setItem: (clave: string, valor: string) => {
        memoria.set(clave, valor)
      },
      removeItem: (clave: string) => {
        memoria.delete(clave)
      },
    },
  })
})

describe('menu de venta confirmada', () => {
  afterEach(() => {
    borrarMenuVenta()
  })

  it('guarda y recupera el pedido para volver al menú', () => {
    guardarMenuVenta('c1', [{ precio: 5, cantidad: 2 }])
    expect(leerMenuVenta()).toEqual({
      clienteId: 'c1',
      venta: [{ precio: 5, cantidad: 2 }],
    })
  })

  it('ignora datos rotos y se puede borrar', () => {
    sessionStorage.setItem('negocio.ventaConfirmada', '{')
    expect(leerMenuVenta()).toBeNull()
    guardarMenuVenta('c1', [{ precio: 5, cantidad: 1 }])
    borrarMenuVenta()
    expect(leerMenuVenta()).toBeNull()
  })
})
