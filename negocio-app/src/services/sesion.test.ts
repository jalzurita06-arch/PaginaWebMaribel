import { AuthApiError, AuthRetryableFetchError } from '@supabase/auth-js'
import { describe, expect, it } from 'vitest'
import { mensajeErrorSesion } from './sesion.ts'

describe('mensajeErrorSesion', () => {
  it('traduce credenciales incorrectas', () => {
    const error = new AuthApiError('Invalid login credentials', 400, 'invalid_credentials')
    expect(mensajeErrorSesion(error)).toBe('Correo o contraseña incorrectos.')
  })

  it('traduce la falta de conexión', () => {
    const error = new AuthRetryableFetchError('Failed to fetch', 0)
    expect(mensajeErrorSesion(error)).toBe(
      'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
    )
  })

  it('traduce un error del servidor', () => {
    const error = new AuthRetryableFetchError('Internal Server Error', 500)
    expect(mensajeErrorSesion(error)).toBe(
      'Error del servidor. Inténtalo de nuevo en un momento.',
    )
  })

  it('no llama error del servidor a un fallo desconocido del cliente', () => {
    const error = new AuthApiError('Something else', 422, 'validation_failed')
    expect(mensajeErrorSesion(error)).toBe('No se pudo iniciar sesión. Inténtalo de nuevo.')
  })
})
