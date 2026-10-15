import { describe, expect, it } from 'vitest'
import { mensajeErrorPrecio } from './precios.ts'

describe('mensajeErrorPrecio', () => {
  it('traduce un valor repetido', () => {
    expect(mensajeErrorPrecio({ code: '23505', message: 'duplicate key' }, 'falló')).toBe(
      'Ese valor ya está en el catálogo.',
    )
  })

  it('traduce la falta de conexión', () => {
    expect(mensajeErrorPrecio(new Error('Failed to fetch'), 'falló')).toBe(
      'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
    )
  })

  it('traduce una sesión vencida', () => {
    expect(mensajeErrorPrecio({ code: '42501', message: 'permission denied' }, 'falló')).toBe(
      'La sesión expiró. Vuelve a entrar.',
    )
  })

  it('usa el mensaje de la acción cuando el error no se reconoce', () => {
    expect(mensajeErrorPrecio({ code: 'XX000', message: 'otro' }, 'No se pudo eliminar el valor.')).toBe(
      'No se pudo eliminar el valor.',
    )
  })
})
