import {
  isAuthError,
  type AuthError,
  type Session,
} from '@supabase/auth-js'
import { supabase } from '../lib/supabase.ts'

const MENSAJE_CREDENCIALES = 'Correo o contraseña incorrectos.'
const MENSAJE_SIN_CONEXION = 'Sin conexión. Revisa tu internet e inténtalo de nuevo.'
const MENSAJE_SERVIDOR = 'Error del servidor. Inténtalo de nuevo en un momento.'
const MENSAJE_CONFIG =
  'Faltan los datos de conexión. Revisa la configuración de la app.'

export type ResultadoSesion = { ok: true } | { ok: false; mensaje: string }

export function supabaseConfigurado(): boolean {
  return supabase !== null
}

function esMensajeDeRed(mensaje: string): boolean {
  const texto = mensaje.toLowerCase()
  return (
    texto.includes('failed to fetch') ||
    texto.includes('fetch failed') ||
    texto.includes('networkerror') ||
    texto.includes('network request failed') ||
    texto.includes('load failed')
  )
}

function esCredencialInvalida(error: AuthError): boolean {
  return (
    error.code === 'invalid_credentials' ||
    error.name === 'AuthInvalidCredentialsError' ||
    error.message.toLowerCase().includes('invalid login credentials')
  )
}

/** Traduce un error de Supabase Auth a un mensaje que se puede mostrar. */
export function mensajeErrorSesion(error: unknown): string {
  if (!isAuthError(error)) {
    if (error instanceof Error && esMensajeDeRed(error.message)) {
      return MENSAJE_SIN_CONEXION
    }
    return MENSAJE_SERVIDOR
  }

  if (esCredencialInvalida(error)) return MENSAJE_CREDENCIALES

  if (error.status === 0 || (error.status == null && esMensajeDeRed(error.message))) {
    return MENSAJE_SIN_CONEXION
  }

  if (typeof error.status === 'number' && error.status >= 500) {
    return MENSAJE_SERVIDOR
  }

  if (error.code === 'email_not_confirmed') {
    return 'Confirma el correo antes de entrar.'
  }

  if (error.code === 'over_request_rate_limit' || error.status === 429) {
    return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
  }

  return 'No se pudo iniciar sesión. Inténtalo de nuevo.'
}

export async function iniciarSesion(
  correo: string,
  contrasena: string,
): Promise<ResultadoSesion> {
  if (!supabase) return { ok: false, mensaje: MENSAJE_CONFIG }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, mensaje: MENSAJE_SIN_CONEXION }
  }

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: correo.trim(),
      password: contrasena,
    })

    if (error) return { ok: false, mensaje: mensajeErrorSesion(error) }
    const validada = await revalidarSesion()
    if (!validada) return { ok: false, mensaje: MENSAJE_SERVIDOR }
    return { ok: true }
  } catch (error) {
    return { ok: false, mensaje: mensajeErrorSesion(error) }
  }
}

/** Cierra la sesión solo en este aparato. */
export async function cerrarSesion(): Promise<ResultadoSesion> {
  if (!supabase) return { ok: false, mensaje: MENSAJE_CONFIG }

  try {
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) return { ok: false, mensaje: mensajeErrorSesion(error) }
    return { ok: true }
  } catch (error) {
    return { ok: false, mensaje: mensajeErrorSesion(error) }
  }
}

/** Confía en getUser (el servidor), no solo en la sesión cacheada de getSession. */
export function sesionSiUsuarioCoincide(
  sesion: Session | null,
  userId: string | undefined,
): Session | null {
  if (!sesion || !userId || sesion.user.id !== userId) return null
  return sesion
}

export async function revalidarSesion(): Promise<Session | null> {
  if (!supabase) return null

  const { data: usuario, error } = await supabase.auth.getUser()
  if (!error && usuario.user) {
    const { data } = await supabase.auth.getSession()
    return sesionSiUsuarioCoincide(data.session, usuario.user.id)
  }

  // Sin red no se puede confirmar el usuario; se conserva la sesión local.
  if (error && esMensajeDeRed(error.message)) {
    const { data } = await supabase.auth.getSession()
    return data.session
  }

  return null
}

export async function exigirSesion(): Promise<ResultadoSesion> {
  const sesion = await revalidarSesion()
  if (!sesion) return { ok: false, mensaje: 'La sesión expiró. Vuelve a entrar.' }
  return { ok: true }
}

/** Avisa en cada cambio. En carga e inicio, revalida con getUser. */
export function escucharSesion(alCambiar: (sesion: Session | null) => void): () => void {
  if (!supabase) {
    alCambiar(null)
    return () => {}
  }

  let serie = 0
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((evento, sesion) => {
    const marca = ++serie
    if (evento === 'SIGNED_OUT') {
      alCambiar(null)
      return
    }

    if (
      evento === 'INITIAL_SESSION' ||
      evento === 'SIGNED_IN' ||
      evento === 'TOKEN_REFRESHED' ||
      evento === 'USER_UPDATED'
    ) {
      void revalidarSesion().then((validada) => {
        if (marca !== serie) return
        alCambiar(validada)
      })
      return
    }

    alCambiar(sesion)
  })

  return () => subscription.unsubscribe()
}
