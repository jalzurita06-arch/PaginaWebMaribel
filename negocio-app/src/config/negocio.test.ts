import { describe, expect, it } from 'vitest'
import { negocio } from './negocio.ts'

describe('configuración del negocio', () => {
  it('usa 593 como prefijo telefónico de ejemplo', () => {
    expect(negocio.telefonoPrefijo).toBe('593')
  })
})
