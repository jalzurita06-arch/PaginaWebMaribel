import { describe, expect, it } from 'vitest'
import { acentoDeRuta, acentoInicio, claveSeccion, mismaSeccion, secciones } from './secciones.ts'

describe('claveSeccion', () => {
  it('agrupa inicio, venta y compartir', () => {
    expect(claveSeccion('/')).toBe('inicio')
    expect(claveSeccion('/venta')).toBe('venta')
    expect(claveSeccion('/compartir/b43')).toBe('venta')
  })

  it('reconoce cada sección del menú', () => {
    expect(claveSeccion('/canasta')).toBe('canasta')
    expect(claveSeccion('/clientes')).toBe('clientes')
    expect(claveSeccion('/catalogo')).toBe('catalogo')
    expect(claveSeccion('/abonos')).toBe('abonos')
  })
})

describe('mismaSeccion', () => {
  it('trata compartir como venta', () => {
    expect(mismaSeccion('/venta', '/compartir/b43')).toBe(true)
  })

  it('distingue canasta de abonos', () => {
    expect(mismaSeccion('/canasta', '/abonos')).toBe(false)
  })
})

describe('acentoDeRuta', () => {
  it('usa el pastel de la sección', () => {
    expect(acentoDeRuta('/')).toBe(acentoInicio)
    expect(acentoDeRuta('/canasta')).toBe(secciones.canasta.acento)
    expect(acentoDeRuta('/abonos')).toBe(secciones.abonos.acento)
  })
})
