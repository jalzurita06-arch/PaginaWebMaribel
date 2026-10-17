import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { MENSAJE_FALLO_RED } from '../lib/conexion.ts'
import { formatearDolares, redondear2 } from '../lib/dinero.ts'
import { validarAbono, type ErroresAbono } from '../lib/clienteFormulario.ts'
import { useConexion } from '../context/useConexion.ts'
import type { Cliente, Resultado } from '../services/clientes.ts'
import { Aviso } from './Aviso.tsx'

type Props = {
  cliente: Cliente
  acento: string
  guardando: boolean
  titulo?: string
  textoCancelar?: string
  inicial?: { monto: number; fecha: string }
  autoFocus?: boolean
  onCancelar?: () => void
  onGuardar: (monto: number, fecha: string) => Promise<Resultado<Cliente>>
}

const campo =
  'rounded-full bg-fondo px-5 py-4 text-base outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black'

export function FormularioAbono({
  cliente,
  acento,
  guardando,
  titulo,
  textoCancelar: _textoCancelar = 'Lista',
  inicial,
  autoFocus = true,
  onCancelar: _onCancelar,
  onGuardar,
}: Props) {
  const { enLinea } = useConexion()
  const idMonto = useId()
  const idFecha = useId()
  const idErrorMonto = useId()
  const idErrorFecha = useId()
  const refMonto = useRef<HTMLInputElement>(null)
  const envio = useRef(false)
  const editando = inicial != null
  const [monto, setMonto] = useState(inicial ? redondear2(inicial.monto).toFixed(2) : '')
  const [fecha, setFecha] = useState(inicial?.fecha ?? fechaHoy)
  const [errores, setErrores] = useState<ErroresAbono>({})
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)

  useEffect(() => {
    if (autoFocus) {
      refMonto.current?.focus()
    }
  }, [autoFocus])

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (envio.current || guardando) return
    setMensaje(null)
    setMensajeExito(null)

    const validacion = validarAbono({ monto, fecha })
    if (!validacion.ok) {
      setErrores(validacion.errores)
      if (validacion.errores.monto && autoFocus) refMonto.current?.focus()
      return
    }
    if (!enLinea) {
      setMensaje(MENSAJE_FALLO_RED)
      return
    }

    envio.current = true
    const resultado = await onGuardar(validacion.datos.monto, validacion.datos.fecha)
    envio.current = false
    if (!resultado.ok) {
      setMensaje(resultado.mensaje)
      return
    }

    setMonto('')
    setErrores({})
    setMensajeExito(`Abono de ${formatearDolares(validacion.datos.monto)} registrado.`)
  }

  return (
    <form className="flex flex-col gap-5" noValidate onSubmit={enviar}>
      <div className="flex flex-col gap-5 rounded-3xl bg-white p-5 shadow-sm lg:max-w-3xl lg:p-8">
        <h2 className="break-words font-display text-2xl uppercase leading-none tracking-wide lg:text-4xl">
          {titulo ?? (editando ? 'Editar abono' : `Abono de ${cliente.codigo}`)}
        </h2>

        <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm" htmlFor={idMonto}>
            Monto
          </label>
          <input
            ref={refMonto}
            id={idMonto}
            name="monto"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={monto}
            aria-invalid={errores.monto ? true : undefined}
            aria-describedby={errores.monto ? idErrorMonto : undefined}
            onChange={(evento) => {
              setMonto(evento.target.value)
              setErrores((actual) => ({ ...actual, monto: undefined }))
              setMensaje(null)
              setMensajeExito(null)
            }}
            className={campo}
          />
          {errores.monto ? (
            <p id={idErrorMonto} className="text-sm">
              {errores.monto}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm" htmlFor={idFecha}>
            Fecha
          </label>
          <input
            id={idFecha}
            name="fecha"
            type="date"
            value={fecha}
            aria-invalid={errores.fecha ? true : undefined}
            aria-describedby={errores.fecha ? idErrorFecha : undefined}
            onChange={(evento) => {
              setFecha(evento.target.value)
              setErrores((actual) => ({ ...actual, fecha: undefined }))
              setMensaje(null)
              setMensajeExito(null)
            }}
            className={campo}
          />
          {errores.fecha ? (
            <p id={idErrorFecha} className="text-sm">
              {errores.fecha}
            </p>
          ) : null}
          </div>
        </div>

        {mensaje ? <Aviso>{mensaje}</Aviso> : null}
        {mensajeExito ? <Aviso tono="ok">{mensajeExito}</Aviso> : null}

        <button
          type="submit"
          disabled={guardando || !enLinea}
          className="rounded-full px-5 py-4 text-base text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50 lg:w-fit lg:px-10"
          style={{ backgroundColor: acento }}
        >
          {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Guardar abono'}
        </button>
      </div>
    </form>
  )
}

function fechaHoy(): string {
  const ahora = new Date()
  const mes = String(ahora.getMonth() + 1).padStart(2, '0')
  const dia = String(ahora.getDate()).padStart(2, '0')
  return `${ahora.getFullYear()}-${mes}-${dia}`
}
