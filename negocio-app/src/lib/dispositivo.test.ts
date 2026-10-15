import { describe, expect, it } from 'vitest'
import { permiteAnimaciones, redEsLenta, type SenalesDispositivo } from './dispositivo.ts'

function senales(parcial: Partial<SenalesDispositivo>): SenalesDispositivo {
  return {
    memoriaGb: null,
    nucleos: null,
    telefono: false,
    reducirMovimiento: false,
    ...parcial,
  }
}

describe('permiteAnimaciones', () => {
  it('anima un celular de gama alta', () => {
    expect(permiteAnimaciones(senales({ telefono: true, memoriaGb: 8, nucleos: 8 }))).toBe(true)
  })

  it('no anima un celular con poca memoria', () => {
    expect(permiteAnimaciones(senales({ telefono: true, memoriaGb: 2, nucleos: 8 }))).toBe(false)
    expect(permiteAnimaciones(senales({ telefono: true, memoriaGb: 4, nucleos: 8 }))).toBe(false)
  })

  it('anima un iPhone reciente aunque no informe la memoria', () => {
    expect(permiteAnimaciones(senales({ telefono: true, memoriaGb: null, nucleos: 6 }))).toBe(true)
  })

  it('no anima un celular sin datos y con pocos núcleos', () => {
    expect(permiteAnimaciones(senales({ telefono: true, memoriaGb: null, nucleos: 4 }))).toBe(false)
  })

  it('respeta la preferencia de menos movimiento', () => {
    expect(
      permiteAnimaciones(senales({ telefono: true, memoriaGb: 8, nucleos: 8, reducirMovimiento: true })),
    ).toBe(false)
  })

  it('anima una computadora, y apaga el movimiento si tiene muy poca memoria', () => {
    expect(permiteAnimaciones(senales({ telefono: false, memoriaGb: 8, nucleos: 4 }))).toBe(true)
    expect(permiteAnimaciones(senales({ telefono: false, memoriaGb: 2, nucleos: 8 }))).toBe(false)
  })
})

describe('redEsLenta', () => {
  it('trata 2G, 3G, ahorro de datos y menos de 1 Mbps como red lenta', () => {
    expect(redEsLenta({ effectiveType: '4g', downlink: 10 })).toBe(false)
    expect(redEsLenta({ effectiveType: '3g', downlink: 2 })).toBe(true)
    expect(redEsLenta({ effectiveType: '2g' })).toBe(true)
    expect(redEsLenta({ saveData: true, effectiveType: '4g' })).toBe(true)
    expect(redEsLenta({ effectiveType: '4g', downlink: 0.4 })).toBe(true)
    expect(redEsLenta(null)).toBe(false)
  })
})
