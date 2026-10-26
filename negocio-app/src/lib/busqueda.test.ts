import { describe, expect, it } from 'vitest'
import { coincideCliente, escaparTerminoOr } from './busqueda.ts'

describe('escaparTerminoOr', () => {
  it('escapa comodines y quita caracteres que rompen el filtro', () => {
    expect(escaparTerminoOr('100%')).toBe('100\\%')
    expect(escaparTerminoOr('a_b')).toBe('a\\_b')
    expect(escaparTerminoOr('ana","estado.eq.activo')).toBe('anaestado.eq.activo')
    expect(escaparTerminoOr('x(y),z')).toBe('xyz')
  })
})

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
