import { describe, expect, it } from 'vitest'
import { coincideCliente, sugerirClientes } from './busqueda.ts'

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

describe('sugerirClientes', () => {
  const opciones = [
    { codigo: 'MART', nombre: 'Martha' },
    { codigo: 'MARTIN', nombre: 'Martin' },
    { codigo: 'LUIS', nombre: 'Luis' },
  ]

  it('sugiere las que empiezan o contienen lo escrito', () => {
    expect(sugerirClientes('ma', opciones).map((opcion) => opcion.codigo)).toEqual(['MART', 'MARTIN'])
  })

  it('sin texto no sugiere nada', () => {
    expect(sugerirClientes('', opciones)).toEqual([])
  })
})
