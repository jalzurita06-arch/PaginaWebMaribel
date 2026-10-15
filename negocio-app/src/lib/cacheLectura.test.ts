import { afterEach, describe, expect, it } from 'vitest'
import { guardarCache, leerCache, olvidarDatosGuardados, pedirDatos, reemplazarCache } from './cacheLectura.ts'

afterEach(() => {
  olvidarDatosGuardados()
})

describe('cache de lecturas', () => {
  it('recupera en memoria lo que acaba de guardar', () => {
    guardarCache('clientes', [{ id: '1' }])
    expect(leerCache<Array<{ id: string }>>('clientes')).toEqual([{ id: '1' }])
  })

  it('sobrevive si el almacenamiento del navegador falla', () => {
    const original = globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => {
          throw new Error('bloqueado')
        },
        setItem: () => {
          throw new Error('bloqueado')
        },
        removeItem: () => {},
        key: () => null,
        length: 0,
      },
    })

    try {
      guardarCache('precios', [1, 2])
      expect(leerCache<number[]>('precios')).toEqual([1, 2])
    } finally {
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: original })
    }
  })

  it('no deja que una respuesta vieja pise la nueva', async () => {
    let resolverViejo: (valor: { ok: true; datos: number }) => void = () => {}
    const viejo = new Promise<{ ok: true; datos: number }>((resolver) => {
      resolverViejo = resolver
    })

    const primera = pedirDatos('lista', () => viejo)
    const segunda = pedirDatos('lista', async () => ({ ok: true as const, datos: 2 }), { fresco: true })
    resolverViejo({ ok: true, datos: 1 })
    await primera
    await segunda

    expect(leerCache<number>('lista')).toBe(2)
  })

  it('una escritura nueva gana a la lectura que seguía en camino', async () => {
    let resolverViejo: (valor: { ok: true; datos: number }) => void = () => {}
    const viejo = new Promise<{ ok: true; datos: number }>((resolver) => {
      resolverViejo = resolver
    })

    const lectura = pedirDatos('lista', () => viejo)
    reemplazarCache('lista', 9)
    resolverViejo({ ok: true, datos: 1 })
    await lectura

    expect(leerCache<number>('lista')).toBe(9)
  })

  it('no vuelve a pedir si el dato se acaba de guardar', async () => {
    let llamadas = 0
    const cargar = async () => {
      llamadas += 1
      return { ok: true as const, datos: 'lista' }
    }

    await pedirDatos('fresca', cargar)
    await pedirDatos('fresca', cargar)
    expect(llamadas).toBe(1)
  })

  it('si se pide fresco, vuelve a la base aunque el dato sea reciente', async () => {
    let llamadas = 0
    const cargar = async () => {
      llamadas += 1
      return { ok: true as const, datos: llamadas }
    }

    await pedirDatos('otra', cargar)
    await pedirDatos('otra', cargar, { fresco: true })
    expect(llamadas).toBe(2)
    expect(leerCache<number>('otra')).toBe(2)
  })

  it('comparte un solo pedido si dos pantallas piden lo mismo a la vez', async () => {
    let llamadas = 0
    const cargar = async () => {
      llamadas += 1
      return { ok: true as const, datos: 'lista' }
    }

    const [a, b] = await Promise.all([pedirDatos('unica', cargar), pedirDatos('unica', cargar)])
    expect(a).toEqual({ ok: true, datos: 'lista' })
    expect(b).toEqual({ ok: true, datos: 'lista' })
    expect(llamadas).toBe(1)
  })
})
