import { useId, useRef, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Layout } from '../components/Layout.tsx'
import { acentoLogin } from '../config/secciones.ts'
import { useConexion } from '../context/useConexion.ts'
import { useSesion } from '../context/useSesion.ts'
import { MENSAJE_FALLO_RED } from '../lib/conexion.ts'
import { validarLogin, type ErroresLogin } from '../lib/login.ts'
import { iniciarSesion, supabaseConfigurado } from '../services/sesion.ts'

export function Login() {
  const { sesion, cargando } = useSesion()
  const { enLinea } = useConexion()
  const idCorreo = useId()
  const idContrasena = useId()
  const idErrorCorreo = useId()
  const idErrorContrasena = useId()
  const refCorreo = useRef<HTMLInputElement>(null)
  const refContrasena = useRef<HTMLInputElement>(null)
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [errores, setErrores] = useState<ErroresLogin>({})
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const avisoConfig = supabaseConfigurado()
    ? null
    : 'Faltan los datos de conexión. Revisa la configuración de la app.'

  if (cargando) return null
  if (sesion) return <Navigate to="/" replace />

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setMensaje(null)

    const erroresCampos = validarLogin(correo, contrasena)
    if (erroresCampos) {
      setErrores(erroresCampos)
      if (erroresCampos.correo) refCorreo.current?.focus()
      else refContrasena.current?.focus()
      return
    }

    if (!enLinea) {
      setMensaje(MENSAJE_FALLO_RED)
      return
    }

    setErrores({})
    setEnviando(true)
    const resultado = await iniciarSesion(correo, contrasena)

    if (!resultado.ok) {
      setMensaje(resultado.mensaje)
      setEnviando(false)
    }
  }

  return (
    <Layout titulo="Entrar" subtitulo="Acceso" acento={acentoLogin}>
      <form
        className="grid gap-5 rounded-3xl bg-white p-5 shadow-sm lg:max-w-3xl lg:grid-cols-2 lg:gap-x-8 lg:p-8"
        noValidate
        onSubmit={enviar}
      >
        <div className="flex flex-col gap-2">
          <label className="text-sm" htmlFor={idCorreo}>
            Correo
          </label>
          <input
            ref={refCorreo}
            id={idCorreo}
            name="correo"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={correo}
            aria-invalid={errores.correo ? true : undefined}
            aria-describedby={errores.correo ? idErrorCorreo : undefined}
            onChange={(evento) => {
              setCorreo(evento.target.value)
              setErrores((actual) => ({ ...actual, correo: undefined }))
              setMensaje(null)
            }}
            className="rounded-full bg-fondo px-5 py-4 text-base outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          />
          {errores.correo ? (
            <p id={idErrorCorreo} className="text-sm">
              {errores.correo}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm" htmlFor={idContrasena}>
            Contraseña
          </label>
          <input
            ref={refContrasena}
            id={idContrasena}
            name="contrasena"
            type="password"
            autoComplete="current-password"
            value={contrasena}
            aria-invalid={errores.contrasena ? true : undefined}
            aria-describedby={errores.contrasena ? idErrorContrasena : undefined}
            onChange={(evento) => {
              setContrasena(evento.target.value)
              setErrores((actual) => ({ ...actual, contrasena: undefined }))
              setMensaje(null)
            }}
            className="rounded-full bg-fondo px-5 py-4 text-base outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          />
          {errores.contrasena ? (
            <p id={idErrorContrasena} className="text-sm">
              {errores.contrasena}
            </p>
          ) : null}
        </div>

        {avisoConfig || mensaje ? (
          <p role="alert" className="rounded-3xl bg-peligro px-4 py-3 text-sm lg:col-span-2">
            {avisoConfig ?? mensaje}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={enviando || !supabaseConfigurado() || !enLinea}
          className="rounded-full bg-black px-5 py-4 text-base text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50 lg:col-span-2 lg:w-fit lg:px-10"
        >
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </Layout>
  )
}
