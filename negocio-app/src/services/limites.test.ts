import { describe, expect, it } from 'vitest'
import {
  LIMITE_ABONOS,
  LIMITE_CLIENTES,
  LIMITE_CODIGOS,
  LIMITE_ENVIOS,
  LIMITE_ITEMS_CANASTA,
  LIMITE_PRECIOS,
} from './limites.ts'

describe('límites de consulta', () => {
  it('usa topes amplios y finitos', () => {
    expect(LIMITE_CLIENTES).toBeGreaterThanOrEqual(200)
    expect(LIMITE_CLIENTES).toBeLessThanOrEqual(10_000)
    expect(LIMITE_ITEMS_CANASTA).toBeGreaterThanOrEqual(200)
    expect(LIMITE_ABONOS).toBeGreaterThanOrEqual(200)
    expect(LIMITE_ENVIOS).toBeGreaterThanOrEqual(50)
    expect(LIMITE_PRECIOS).toBeGreaterThanOrEqual(50)
    expect(LIMITE_CODIGOS).toBeGreaterThanOrEqual(10)
  })
})
