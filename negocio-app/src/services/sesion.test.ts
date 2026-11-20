import { AuthApiError, AuthRetryableFetchError } from '@supabase/auth-js'
import { describe, expect, it } from 'vitest'
import { mensajeErrorSesion, sesionSiUsuarioCoincide } from './sesion.ts'

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

describe('sesionSiUsuarioCoincide', () => {
  const sesion = {
    access_token: 'a',
    refresh_token: 'b',
    expires_in: 1,
    token_type: 'bearer',
    user: { id: 'usuario-1' },
  } as unknown as import('@supabase/auth-js').Session

  it('acepta la sesión solo si getUser confirma el mismo usuario', () => {
    expect(sesionSiUsuarioCoincide(sesion, 'usuario-1')).toBe(sesion)
  })

  it('descarta la sesión cacheada si no hay usuario o no coincide', () => {
    expect(sesionSiUsuarioCoincide(sesion, undefined)).toBeNull()
    expect(sesionSiUsuarioCoincide(sesion, 'otro')).toBeNull()
    expect(sesionSiUsuarioCoincide(null, 'usuario-1')).toBeNull()
  })
})
