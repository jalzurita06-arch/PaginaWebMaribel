import { describe, expect, it } from 'vitest'
import { destinoDeSalto } from './transicion.ts'

describe('destinoDeSalto', () => {
  it('no salta si ya está en esa sección', () => {
    expect(destinoDeSalto('/', '/')).toBeNull()
    expect(destinoDeSalto('/venta', '/venta')).toBeNull()
    expect(destinoDeSalto('/venta', '/compartir/abc')).toBeNull()
  })

  it('salta a otra sección', () => {
    expect(destinoDeSalto('/', '/mensaje')).toBe('/mensaje')
    expect(destinoDeSalto('/', '/clientes')).toBe('/clientes')
    expect(destinoDeSalto('/clientes', '/canasta')).toBe('/canasta')
  })
})
