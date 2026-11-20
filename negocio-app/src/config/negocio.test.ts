import { describe, expect, it } from 'vitest'
import { negocio } from './negocio.ts'

describe('configuración del negocio', () => {
  it('usa 593 como prefijo telefónico de ejemplo', () => {
    expect(negocio.telefonoPrefijo).toBe('593')
  })

  it('no incluye cuenta ni cédula reales en el bundle público', () => {
    expect(negocio.numeroCuenta).toBe('')
    expect(negocio.cedula).toBe('')
    expect(negocio.numeroCuenta).not.toMatch(/\d{6,}/)
    expect(negocio.cedula).not.toMatch(/\d{6,}/)
  })
})
