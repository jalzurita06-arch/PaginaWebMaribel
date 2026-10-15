import { z } from 'zod'

const esquemaLogin = z.object({
  correo: z.email('Escribe un correo válido.'),
  contrasena: z.string().min(1, 'Escribe la contraseña.'),
})

export type ErroresLogin = {
  correo?: string
  contrasena?: string
}

/** Devuelve los errores de campos, o null si el formulario puede enviarse. */
export function validarLogin(correo: string, contrasena: string): ErroresLogin | null {
  const validacion = esquemaLogin.safeParse({
    correo: correo.trim(),
    contrasena,
  })

  if (validacion.success) return null

  const errores: ErroresLogin = {}
  for (const issue of validacion.error.issues) {
    const campo = issue.path[0]
    if ((campo === 'correo' || campo === 'contrasena') && !errores[campo]) {
      errores[campo] = issue.message
    }
  }
  return errores
}
