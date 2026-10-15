import { describe, expect, it } from 'vitest'
import { coincideCliente } from './busqueda.ts'

describe('coincideCliente', () => {
  it('encuentra por código o por el comienzo del nombre', () => {
    expect(coincideCliente('ma', 'MART', 'Martina')).toBe(true)
    expect(coincideCliente('ma', 'LUIS', 'Martin')).toBe(true)
    expect(coincideCliente('lu', 'LUIS', 'Martin')).toBe(true)
    expect(coincideCliente('pe', 'MART', 'Martina')).toBe(false)
  })

  it('sin texto deja pasar a todos', () => {
    expect(coincideCliente('  ', 'MART', null)).toBe(true)
  })
})
