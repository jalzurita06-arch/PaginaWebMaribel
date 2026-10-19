import { describe, expect, it } from 'vitest'
import { mensajeErrorPlantilla } from './plantilla.ts'

describe('mensajeErrorPlantilla', () => {
  it('traduce la falta de conexión', () => {
    expect(mensajeErrorPlantilla(new Error('Failed to fetch'), 'falló')).toBe(
      'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
    )
  })

  it('traduce una sesión vencida', () => {
    expect(mensajeErrorPlantilla({ code: '42501', message: 'permission denied' }, 'falló')).toBe(
      'La sesión expiró. Vuelve a entrar.',
    )
  })
})
