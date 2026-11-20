import { describe, expect, it } from 'vitest'
import {
  MENSAJE_DESCARGA_EXCEL,
  MENSAJE_DESCARGA_PDF,
  MENSAJE_IMAGEN_PEDIDO,
  MENSAJE_SIN_CONEXION,
  mensajeErrorDescarga,
  mensajeErrorHumano,
} from './errores.ts'

describe('mensajeErrorHumano', () => {
  it('traduce fallos de red y no muestra el texto crudo', () => {
    expect(mensajeErrorHumano(new Error('Failed to fetch'), 'falló')).toBe(MENSAJE_SIN_CONEXION)
    expect(mensajeErrorHumano(new Error('NetworkError when attempting to fetch'), 'falló')).toBe(
      MENSAJE_SIN_CONEXION,
    )
    expect(mensajeErrorHumano(new Error('JWT expired at xyz'), MENSAJE_IMAGEN_PEDIDO)).toBe(
      MENSAJE_IMAGEN_PEDIDO,
    )
  })
})

describe('mensajeErrorDescarga', () => {
  it('usa un mensaje claro para PDF y Excel', () => {
    expect(mensajeErrorDescarga('pdf')).toBe(MENSAJE_DESCARGA_PDF)
    expect(mensajeErrorDescarga('excel')).toBe(MENSAJE_DESCARGA_EXCEL)
  })
})
