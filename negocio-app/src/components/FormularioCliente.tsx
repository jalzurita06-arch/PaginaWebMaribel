import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { MENSAJE_FALLO_RED } from '../lib/conexion.ts'
import { useConexion } from '../context/useConexion.ts'
import { Aviso } from './Aviso.tsx'
import {
  capitalizarNombre,
  validarEdicionCliente,
  validarNuevoCliente,
  type DatosEdicionCliente,
  type DatosNuevoCliente,
  type ErroresCliente,
} from '../lib/clienteFormulario.ts'
import { MENSAJE_CODIGO_REPETIDO, type Cliente, type Resultado } from '../services/clientes.ts'

type Props = {
  modo: 'crear' | 'editar'
  cliente?: Cliente
  guardando: boolean
  acento: string
  onCancelar: () => void
  onCrear: (datos: DatosNuevoCliente) => Promise<Resultado<Cliente>>
  onEditar: (datos: DatosEdicionCliente) => Promise<Resultado<Cliente>>
}

const campo =
  'rounded-full bg-fondo px-5 py-4 text-base outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black'

export function FormularioCliente({
  modo,
  cliente,
  guardando,
  acento,
  onCancelar: _onCancelar,
  onCrear,
  onEditar,
}: Props) {
  const { enLinea } = useConexion()
  const esNuevo = modo === 'crear'
  const idCodigo = useId()
  const idNombre = useId()
  const idTelefono = useId()
  const idAbono = useId()
  const idErrorCodigo = useId()
  const idErrorNombre = useId()
  const idErrorTelefono = useId()
  const idErrorAbono = useId()
  const idAyudaAbono = useId()
  const refCodigo = useRef<HTMLInputElement>(null)
  const refTelefono = useRef<HTMLInputElement>(null)
  const refAbono = useRef<HTMLInputElement>(null)
  const [codigo, setCodigo] = useState(cliente?.codigo ?? '')
  const [nombre, setNombre] = useState(cliente?.nombre ?? '')
  const [telefono, setTelefono] = useState(cliente?.telefono ?? '')
  const [abonoInicial, setAbonoInicial] = useState('')
  const [errores, setErrores] = useState<ErroresCliente>({})
  const [mensaje, setMensaje] = useState<string | null>(null)
  const envio = useRef(false)

  useEffect(() => {
    refCodigo.current?.focus()
  }, [])

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (envio.current || guardando) return
    setMensaje(null)

    if (esNuevo) {
      const validacion = validarNuevoCliente({ codigo, nombre, telefono, abonoInicial })
      if (!validacion.ok) {
        setErrores(validacion.errores)
        enfocar(validacion.errores)
        return
      }
      if (!enLinea) {
        setMensaje(MENSAJE_FALLO_RED)
        return
      }
      envio.current = true
      const resultado = await onCrear(validacion.datos)
      envio.current = false
      if (!resultado.ok) mostrarFallo(resultado.mensaje)
      return
    }

    const validacion = validarEdicionCliente({ codigo, nombre, telefono })
    if (!validacion.ok) {
      setErrores(validacion.errores)
      enfocar(validacion.errores)
      return
    }
    if (!enLinea) {
      setMensaje(MENSAJE_FALLO_RED)
      return
    }
    envio.current = true
    const resultado = await onEditar(validacion.datos)
    envio.current = false
    if (!resultado.ok) mostrarFallo(resultado.mensaje)
  }

  function mostrarFallo(texto: string) {
    if (texto === MENSAJE_CODIGO_REPETIDO) {
      setErrores({ codigo: texto })
      refCodigo.current?.focus()
      return
    }
    setMensaje(texto)
  }

  function enfocar(siguientes: ErroresCliente) {
    if (siguientes.codigo) refCodigo.current?.focus()
    else if (siguientes.telefono) refTelefono.current?.focus()
    else refAbono.current?.focus()
  }

  return (
    <form className="flex flex-col gap-5" noValidate onSubmit={enviar}>
      <div className="flex flex-col gap-5 rounded-3xl bg-white p-5 shadow-sm lg:p-8">
        <h2 className="font-display text-2xl uppercase leading-none tracking-wide lg:text-4xl">
          {esNuevo ? 'Nuevo cliente' : 'Editar cliente'}
        </h2>

        <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm" htmlFor={idCodigo}>
            Código
          </label>
          <input
            ref={refCodigo}
            id={idCodigo}
            name="codigo"
            value={codigo}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={errores.codigo ? true : undefined}
            aria-describedby={errores.codigo ? idErrorCodigo : undefined}
            onChange={(evento) => {
              setCodigo(evento.target.value)
              setErrores((actual) => ({ ...actual, codigo: undefined }))
              setMensaje(null)
            }}
            className={campo}
          />
          {errores.codigo ? (
            <p id={idErrorCodigo} className="text-sm">
              {errores.codigo}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm" htmlFor={idNombre}>
            Nombre (opcional)
          </label>
          <input
            id={idNombre}
            name="nombre"
            value={nombre}
            autoComplete="name"
            autoCapitalize="words"
            aria-invalid={errores.nombre ? true : undefined}
            aria-describedby={errores.nombre ? idErrorNombre : undefined}
            onChange={(evento) => {
              setNombre(capitalizarNombre(evento.target.value))
              setErrores((actual) => ({ ...actual, nombre: undefined }))
            }}
            className={campo}
          />
          {errores.nombre ? (
            <p id={idErrorNombre} className="text-sm">
              {errores.nombre}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm" htmlFor={idTelefono}>
            Teléfono
          </label>
          <input
            ref={refTelefono}
            id={idTelefono}
            name="telefono"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            maxLength={10}
            value={telefono}
            aria-invalid={errores.telefono ? true : undefined}
            aria-describedby={errores.telefono ? idErrorTelefono : undefined}
            onChange={(evento) => {
              setTelefono(evento.target.value.replace(/\D/g, '').slice(0, 10))
              setErrores((actual) => ({ ...actual, telefono: undefined }))
              setMensaje(null)
            }}
            className={campo}
          />
          {errores.telefono ? (
            <p id={idErrorTelefono} className="text-sm">
              {errores.telefono}
            </p>
          ) : null}
        </div>

        {esNuevo ? (
          <div className="flex flex-col gap-2">
            <label className="text-sm" htmlFor={idAbono}>
              Abono inicial (opcional)
            </label>
            <input
              ref={refAbono}
              id={idAbono}
              name="abonoInicial"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={abonoInicial}
              aria-invalid={errores.abonoInicial ? true : undefined}
              aria-describedby={
                errores.abonoInicial ? `${idAyudaAbono} ${idErrorAbono}` : idAyudaAbono
              }
              onChange={(evento) => {
                setAbonoInicial(evento.target.value)
                setErrores((actual) => ({ ...actual, abonoInicial: undefined }))
                setMensaje(null)
              }}
              className={campo}
            />
            <p id={idAyudaAbono} className="text-sm text-black/60">
              Si lo escribes, se suma al saldo a favor.
            </p>
            {errores.abonoInicial ? (
              <p id={idErrorAbono} className="text-sm">
                {errores.abonoInicial}
              </p>
            ) : null}
          </div>
        ) : null}
        </div>

        {mensaje ? <Aviso>{mensaje}</Aviso> : null}

        <button
          type="submit"
          disabled={guardando || !enLinea}
          className="rounded-full px-5 py-4 text-base text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50 lg:w-fit lg:px-10"
          style={{ backgroundColor: acento }}
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
