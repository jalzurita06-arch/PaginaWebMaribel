import { describe, expect, it } from 'vitest'
import { validarLogin } from './login.ts'

describe('validarLogin', () => {
  it('acepta un correo y una contraseña', () => {
    expect(validarLogin('tia@negocio.com', 'secreto')).toBeNull()
  })

  it('recorta el correo antes de validar', () => {
    expect(validarLogin('  tia@negocio.com  ', 'secreto')).toBeNull()
  })

  it('pide un correo válido y la contraseña', () => {
    expect(validarLogin('no-es-correo', '')).toEqual({
      correo: 'Escribe un correo válido.',
      contrasena: 'Escribe la contraseña.',
    })
  })
})
