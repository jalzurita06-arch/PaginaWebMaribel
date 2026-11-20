import { describe, expect, it } from 'vitest'
import { avisoPersistente, DURACION_BURBUJA_MS } from './feedback.ts'

describe('aviso persistente', () => {
  it('deja el aviso en pantalla también cuando sale bien', () => {
    expect(avisoPersistente('Canasta enviada.', 'ok')).toEqual({
      texto: 'Canasta enviada.',
      tono: 'ok',
    })
    expect(avisoPersistente('No se pudo borrar.', 'error')).toEqual({
      texto: 'No se pudo borrar.',
      tono: 'error',
    })
  })

  it('da tiempo de leer la burbuja y no la esconde en 2 segundos', () => {
    expect(DURACION_BURBUJA_MS).toBeGreaterThanOrEqual(6000)
  })
})
