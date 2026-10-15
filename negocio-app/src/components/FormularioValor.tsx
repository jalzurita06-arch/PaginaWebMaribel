import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useConexion } from '../context/useConexion.ts'
import { MENSAJE_FALLO_RED } from '../lib/conexion.ts'
import { montoDesdeTexto, validarValorPrecio } from '../lib/precios.ts'
import { BotonAccion } from './BotonAccion.tsx'

type FormularioValorProps = {
  textoInicial?: string
  textoBoton: string
  existentes: number[]
  ocupado: boolean
  errorServidor: string | null
  aviso?: string
  onCancelar: () => void
  onEscribir: () => void
  onGuardar: (valor: number) => void
}

export function FormularioValor({
  textoInicial = '',
  textoBoton,
  existentes,
  ocupado,
  errorServidor,
  aviso,
  onCancelar,
  onEscribir,
  onGuardar,
}: FormularioValorProps) {
  const { enLinea } = useConexion()
  const idCampo = useId()
  const idError = useId()
  const refCampo = useRef<HTMLInputElement>(null)
  const [texto, setTexto] = useState(textoInicial)
  const [errorCampo, setErrorCampo] = useState<string | null>(null)
  const error = errorCampo ?? errorServidor

  useEffect(() => {
    refCampo.current?.focus()
  }, [])

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const mensaje = validarValorPrecio(texto, existentes)
    if (mensaje) {
      setErrorCampo(mensaje)
      refCampo.current?.focus()
      return
    }
    if (!enLinea) {
      setErrorCampo(MENSAJE_FALLO_RED)
      return
    }
    setErrorCampo(null)
    onGuardar(montoDesdeTexto(texto))
  }

  return (
    <form className="flex flex-col gap-3" noValidate onSubmit={enviar}>
      <div className="flex flex-col gap-2">
        <label className="text-sm" htmlFor={idCampo}>
          Valor
        </label>
        <input
          ref={refCampo}
          id={idCampo}
          name="valor"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          placeholder="0.00"
          value={texto}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? idError : undefined}
          onChange={(evento) => {
            setTexto(evento.target.value)
            setErrorCampo(null)
            onEscribir()
          }}
          className="rounded-full bg-fondo px-5 py-4 text-base outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        />
        {error ? (
          <p id={idError} role="alert" className="text-sm">
            {error}
          </p>
        ) : null}
      </div>
      {aviso ? (
        <p className="rounded-3xl bg-aviso px-4 py-3 text-sm leading-relaxed">{aviso}</p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <BotonAccion type="submit" variante="primario" disabled={ocupado || !enLinea}>
          {ocupado ? 'Guardando…' : textoBoton}
        </BotonAccion>
        <BotonAccion onClick={onCancelar} disabled={ocupado}>
          Cancelar
        </BotonAccion>
      </div>
    </form>
  )
}
