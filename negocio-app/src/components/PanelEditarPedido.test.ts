import { describe, expect, it } from 'vitest'
import { textoFechaPedido } from './PanelEditarPedido.tsx'

describe('textoFechaPedido', () => {
  it('formatea correctamente una fecha YYYY-MM-DD', () => {
    expect(textoFechaPedido('2026-10-14')).toBe('14 oct 2026')
    expect(textoFechaPedido('2026-01-05')).toBe('5 ene 2026')
    expect(textoFechaPedido('2026-12-31')).toBe('31 dic 2026')
  })

  it('devuelve el valor original si el formato no es válido', () => {
    expect(textoFechaPedido('invalida')).toBe('invalida')
    expect(textoFechaPedido('2026-13-01')).toBe('2026-13-01')
  })
})
