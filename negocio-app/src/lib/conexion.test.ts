import { describe, expect, it } from 'vitest'
import { MENSAJE_FALLO_RED, MENSAJE_FRANJA, estaEnLinea } from './conexion.ts'

describe('estaEnLinea', () => {
  it('marca sin conexión solo cuando el navegador dice false', () => {
    expect(estaEnLinea(false)).toBe(false)
    expect(estaEnLinea(true)).toBe(true)
    expect(estaEnLinea(undefined)).toBe(true)
  })
})

describe('mensajes de conexión', () => {
  it('conserva el texto de la franja y el del fallo al guardar', () => {
    expect(MENSAJE_FRANJA).toBe('Sin conexión. Los cambios no se pueden guardar.')
    expect(MENSAJE_FALLO_RED).toBe('Sin conexión. Revisa tu internet e inténtalo de nuevo.')
  })
})
