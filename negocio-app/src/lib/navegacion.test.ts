import { describe, expect, it } from 'vitest'
import {
  canastaAbiertaDesdeEstado,
  destinoVolver,
  estadoCanastaAbierta,
  rutaAbonoDesdeCanasta,
  vieneDeCanasta,
} from './navegacion.ts'

describe('regreso desde abonos hacia canasta', () => {
  it('marca el abono abierto desde una canasta', () => {
    expect(rutaAbonoDesdeCanasta('cli ente')).toBe('/abonos?cliente=cli%20ente&desde=canasta')
  })

  it('reconoce el origen solo en el detalle de abonos', () => {
    const desdeCanasta = new URLSearchParams('cliente=b43&desde=canasta')
    expect(vieneDeCanasta('/abonos', desdeCanasta)).toBe(true)
    expect(vieneDeCanasta('/abonos', new URLSearchParams('cliente=b43'))).toBe(false)
    expect(vieneDeCanasta('/canasta', desdeCanasta)).toBe(false)
  })

  it('vuelve a la canasta si el abono se abrió desde ahí', () => {
    expect(destinoVolver('/abonos', new URLSearchParams('cliente=b43&desde=canasta'))).toBe('/canasta')
  })

  it('desde abonos, sin venir de una canasta, vuelve al inicio', () => {
    expect(destinoVolver('/abonos', new URLSearchParams('cliente=b43'))).toBe('/')
    expect(destinoVolver('/abonos', new URLSearchParams())).toBe('/')
  })

  it('conserva el regreso de compartir', () => {
    expect(destinoVolver('/compartir/b43', new URLSearchParams('desde=venta'))).toBe('/venta')
    expect(destinoVolver('/compartir/b43', new URLSearchParams())).toBe('/canasta')
  })

  it('recupera la canasta que estaba abierta', () => {
    expect(estadoCanastaAbierta('b43')).toEqual({ abierta: 'b43' })
    expect(estadoCanastaAbierta(null)).toBeUndefined()
    expect(canastaAbiertaDesdeEstado({ abierta: 'b43' })).toBe('b43')
    expect(canastaAbiertaDesdeEstado(null)).toBeNull()
    expect(canastaAbiertaDesdeEstado({ abierta: '' })).toBeNull()
  })
})
