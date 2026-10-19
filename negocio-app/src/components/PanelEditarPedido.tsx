import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Minus, Plus, X } from 'lucide-react'
import { Aviso } from './Aviso.tsx'
import { secciones } from '../config/secciones.ts'
import { CLAVE_PRECIOS } from '../lib/cacheLectura.ts'
import { formatearDolares, redondear2 } from '../lib/dinero.ts'
import { agruparPorPrecio, type GrupoPrecio, type ItemCanasta } from '../lib/reglas.ts'
import { useDatos } from '../lib/useDatos.ts'
import { transicionDesplegar } from './PanelDesplegable.tsx'
import { editarPedidoFecha, leerCantidadEntera, textoCantidadEntera } from '../services/canasta.ts'
import { listarPrecios } from '../services/precios.ts'

const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function textoFechaPedido(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-')
  const indice = Number(mes) - 1
  if (!anio || !dia || indice < 0 || indice > 11) return fecha
  return `${Number(dia)} ${meses[indice]} ${anio}`
}

export type PedidoAEditar = {
  clienteId: string
  clienteCodigo: string
  clienteNombre: string | null
  fecha: string
  grupos: GrupoPrecio[]
}

export type PanelEditarPedidoProps = {
  pedido: PedidoAEditar | null
  abierto: boolean
  onCerrar: () => void
  onGuardado: () => void
}

const botonBase =
  'inline-flex touch-manipulation items-center justify-center rounded-full text-center [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50'

const boton = `${botonBase} min-h-12 w-full px-4 py-3 text-base`
const toque = { scale: 0.97 }

export function PanelEditarPedido({
  pedido,
  abierto,
  onCerrar,
  onGuardado,
}: PanelEditarPedidoProps) {
  const tituloId = useId()
  const idCantidad = useId()
  const idError = useId()
  const reducirMovimiento = useReducedMotion()
  const acento = secciones.venta.acento
  const { datos: catalogoPrecios } = useDatos(CLAVE_PRECIOS, () => listarPrecios())
  const refCantidad = useRef<HTMLInputElement>(null)
  const refFormulario = useRef<HTMLFormElement>(null)

  const [lineas, setLineas] = useState<ItemCanasta[]>([])
  const [precioElegido, setPrecioElegido] = useState<number | null>(null)
  const [textoCantidad, setTextoCantidad] = useState('1')
  const [errorCantidad, setErrorCantidad] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null)
  const [editandoPrecio, setEditandoPrecio] = useState<number | null>(null)

  useLayoutEffect(() => {
    if (abierto && pedido) {
      setLineas(pedido.grupos.map((g) => ({ precio: g.precio, cantidad: g.cantidad })))
      setPrecioElegido(null)
      setTextoCantidad('1')
      setErrorCantidad(null)
      setErrorGuardado(null)
      setGuardando(false)
      setEditandoPrecio(null)
    }
  }, [abierto, pedido])

  useEffect(() => {
    if (!abierto) return
    function alTecla(e: KeyboardEvent) {
      if (e.key === 'Escape' && !guardando) {
        onCerrar()
      }
    }
    window.addEventListener('keydown', alTecla)
    return () => window.removeEventListener('keydown', alTecla)
  }, [abierto, guardando, onCerrar])

  useEffect(() => {
    if (precioElegido == null) return
    refFormulario.current?.scrollIntoView({ block: 'nearest' })
    refCantidad.current?.focus({ preventScroll: true })
  }, [precioElegido])

  if (!pedido) return null

  const totalPrendas = lineas.reduce((acc, l) => acc + l.cantidad, 0)
  const totalMonto = redondear2(lineas.reduce((acc, l) => acc + l.precio * l.cantidad, 0))
  const gruposOrdenados = [...agruparPorPrecio(lineas)].sort((a, b) => a.precio - b.precio)
  const preciosOrdenados = [...(catalogoPrecios ?? [])].sort((a, b) => a.valor - b.valor)
  const cantidadActual = leerCantidadEntera(textoCantidad)
  const subtotal =
    precioElegido != null && cantidadActual != null
      ? redondear2(precioElegido * cantidadActual)
      : null

  function elegirPrecio(valor: number) {
    setPrecioElegido(valor)
    setTextoCantidad('1')
    setErrorCantidad(null)
  }

  function ajustarCantidad(delta: 1 | -1) {
    const actual = cantidadActual ?? 0
    const siguiente = actual + delta
    if (siguiente < 1 || !Number.isSafeInteger(siguiente)) return
    setTextoCantidad(String(siguiente))
    setErrorCantidad(null)
  }

  function agregarLinea(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (precioElegido == null || guardando) return
    const cantidad = leerCantidadEntera(textoCantidad)
    if (cantidad == null) {
      setErrorCantidad('La cantidad debe ser un entero mayor que 0.')
      return
    }
    setLineas((prev) => {
      const indice = prev.findIndex((item) => item.precio === precioElegido)
      if (indice === -1) return [...prev, { precio: precioElegido, cantidad }]
      const actual = prev[indice]!
      const siguiente = actual.cantidad + cantidad
      if (!Number.isSafeInteger(siguiente)) return prev
      const copia = [...prev]
      copia[indice] = { ...actual, cantidad: siguiente }
      return copia
    })
    setTextoCantidad('1')
    setErrorCantidad(null)
  }

  function cambiarCantidadLinea(precio: number, delta: number) {
    setLineas((prev) =>
      prev.flatMap((item) => {
        if (item.precio !== precio) return [item]
        const siguiente = item.cantidad + delta
        if (!Number.isSafeInteger(siguiente) || siguiente < 1) return [item]
        return [{ ...item, cantidad: siguiente }]
      }),
    )
  }

  function eliminarLinea(precio: number) {
    setLineas((prev) => prev.filter((item) => item.precio !== precio))
    setEditandoPrecio((actual) => (actual === precio ? null : actual))
  }

  async function handleGuardar() {
    if (!pedido || guardando) return
    setErrorGuardado(null)
    setGuardando(true)

    const resultado = await editarPedidoFecha(pedido.clienteId, pedido.fecha, lineas)
    if (!resultado.ok) {
      setErrorGuardado(resultado.mensaje)
      setGuardando(false)
      return
    }

    setGuardando(false)
    onGuardado()
  }

  const transicion = reducirMovimiento ? ({ duration: 0 } as const) : transicionDesplegar

  return createPortal(
    <AnimatePresence>
      {abierto ? (
        <motion.div
          key="modal-editar-pedido"
          role="dialog"
          aria-modal="true"
          aria-labelledby={tituloId}
          initial={reducirMovimiento ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reducirMovimiento ? undefined : { opacity: 0 }}
          transition={transicion}
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
        >
          <button
            type="button"
            aria-label="Cerrar panel de edición"
            disabled={guardando}
            onClick={() => {
              if (!guardando) onCerrar()
            }}
            className="absolute inset-0 bg-black/40"
          />

          <motion.div
            initial={reducirMovimiento ? false : { opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducirMovimiento ? undefined : { opacity: 0, y: 36 }}
            transition={transicion}
            className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-fondo shadow-2xl sm:rounded-3xl"
            style={{ height: 'min(90dvh, 42rem)' }}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-black/10 bg-white px-5 py-3.5">
              <div className="flex min-w-0 flex-col">
                <h2 id={tituloId} className="text-lg font-bold tracking-tight text-black">
                  Editar pedido
                </h2>
                <p className="truncate text-sm text-black/60">
                  <span className="font-semibold text-black uppercase">{pedido.clienteCodigo}</span>
                  {pedido.clienteNombre ? ` · ${pedido.clienteNombre}` : ''}
                  {` · ${textoFechaPedido(pedido.fecha)}`}
                </p>
              </div>

              <button
                type="button"
                aria-label="Cerrar"
                disabled={guardando}
                onClick={onCerrar}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-black/5 text-black hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                <X size={20} aria-hidden />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
              {errorGuardado ? <Aviso tono="error">{errorGuardado}</Aviso> : null}

              {preciosOrdenados.length > 0 ? (
                <div
                  role="group"
                  aria-label="Valores de prenda"
                  className="grid grid-cols-3 gap-2"
                >
                  {preciosOrdenados.map((precio) => {
                    const elegido = precio.valor === precioElegido
                    return (
                      <motion.button
                        key={precio.id}
                        type="button"
                        aria-pressed={elegido}
                        disabled={guardando}
                        onClick={() => elegirPrecio(precio.valor)}
                        whileTap={reducirMovimiento || guardando ? undefined : toque}
                        transition={{ duration: 0.15 }}
                        className="flex min-h-11 touch-manipulation items-center justify-center rounded-full px-2 font-display text-lg leading-none tracking-wide [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-40"
                        style={{
                          backgroundColor: elegido ? '#000' : acento,
                          color: elegido ? '#fff' : '#000',
                        }}
                      >
                        {formatearDolares(precio.valor)}
                      </motion.button>
                    )
                  })}
                </div>
              ) : (
                <p className="rounded-2xl bg-white px-4 py-3 text-sm text-black/60">
                  Todavía no hay valores en el catálogo.
                </p>
              )}

              {precioElegido != null ? (
                <form
                  ref={refFormulario}
                  className="flex scroll-mt-2 flex-col gap-2 rounded-3xl bg-white p-3.5 shadow-sm"
                  noValidate
                  onSubmit={agregarLinea}
                >
                  <label className="text-sm" htmlFor={idCantidad}>
                    Cantidad de {formatearDolares(precioElegido)}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Menos"
                      disabled={guardando || cantidadActual == null || cantidadActual <= 1}
                      onClick={() => ajustarCantidad(-1)}
                      className="inline-flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-full text-black [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-40"
                      style={{ backgroundColor: acento }}
                    >
                      <Minus aria-hidden size={18} strokeWidth={2} />
                    </button>
                    <input
                      ref={refCantidad}
                      id={idCantidad}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      enterKeyHint="done"
                      value={textoCantidad}
                      disabled={guardando}
                      aria-invalid={errorCantidad ? true : undefined}
                      aria-describedby={errorCantidad ? idError : undefined}
                      onChange={(evento) => {
                        setTextoCantidad(textoCantidadEntera(evento.target.value))
                        setErrorCantidad(null)
                      }}
                      className="min-h-11 min-w-0 flex-1 rounded-full bg-fondo px-4 text-center text-base outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                    />
                    <button
                      type="button"
                      aria-label="Más"
                      disabled={
                        guardando ||
                        (cantidadActual != null && !Number.isSafeInteger(cantidadActual + 1))
                      }
                      onClick={() => ajustarCantidad(1)}
                      className="inline-flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-full bg-afirmar text-black [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-40"
                    >
                      <Plus aria-hidden size={18} strokeWidth={2} />
                    </button>
                  </div>
                  {errorCantidad ? (
                    <p id={idError} role="alert" className="text-sm">
                      {errorCantidad}
                    </p>
                  ) : null}
                  <p className="flex items-baseline justify-between gap-3 text-sm">
                    <span>Subtotal</span>
                    <span className="font-display text-2xl leading-none tracking-wide">
                      {subtotal == null ? '—' : formatearDolares(subtotal)}
                    </span>
                  </p>
                  <button
                    type="submit"
                    disabled={guardando || subtotal == null}
                    className={`${botonBase} min-h-11 w-full bg-black px-4 text-base text-white`}
                  >
                    Agregar
                  </button>
                </form>
              ) : null}

              <section className="flex flex-col gap-2.5 rounded-3xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base">En este día</h3>
                  <span className="rounded-full bg-black/5 px-3 py-1 text-sm font-semibold tabular-nums text-black/70">
                    {totalPrendas} {totalPrendas === 1 ? 'prenda' : 'prendas'}
                  </span>
                </div>

                {gruposOrdenados.length === 0 ? (
                  <p className="py-3 text-center text-sm text-black/60">
                    No hay prendas. Si guardas ahora, se borrará esta compra.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2.5">
                    {gruposOrdenados.map((grupo) => {
                      const monto = formatearDolares(grupo.precio)
                      const editando = editandoPrecio === grupo.precio
                      return (
                        <li key={grupo.precio} className="flex items-center justify-between gap-2">
                          <span className="min-w-0">
                            <span className="block text-sm">
                              {monto} × {grupo.cantidad}
                            </span>
                            <span className="text-sm text-black/60">
                              {formatearDolares(grupo.subtotal)}
                            </span>
                          </span>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {editando ? (
                              <>
                                <button
                                  type="button"
                                  aria-label={`Menos una de ${monto}`}
                                  disabled={guardando || grupo.cantidad <= 1}
                                  onClick={() => cambiarCantidadLinea(grupo.precio, -1)}
                                  className="inline-flex size-10 touch-manipulation items-center justify-center rounded-full bg-peligro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-40"
                                >
                                  <Minus aria-hidden size={16} strokeWidth={2} />
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Más una de ${monto}`}
                                  disabled={guardando || !Number.isSafeInteger(grupo.cantidad + 1)}
                                  onClick={() => cambiarCantidadLinea(grupo.precio, 1)}
                                  className="inline-flex size-10 touch-manipulation items-center justify-center rounded-full bg-afirmar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-40"
                                >
                                  <Plus aria-hidden size={16} strokeWidth={2} />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                disabled={guardando}
                                onClick={() => setEditandoPrecio(grupo.precio)}
                                className="inline-flex min-h-10 touch-manipulation items-center rounded-full bg-black/5 px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                              >
                                Cantidad
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={guardando}
                              onClick={() => eliminarLinea(grupo.precio)}
                              aria-label={`Quitar ${monto}, cantidad ${grupo.cantidad}`}
                              className="inline-flex min-h-10 touch-manipulation items-center rounded-full bg-borrar px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                            >
                              Quitar
                            </button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}

                <p className="flex items-baseline justify-between gap-3">
                  <span className="text-sm">Total del día</span>
                  <span className="font-display text-2xl leading-none tracking-wide">
                    {formatearDolares(totalMonto)}
                  </span>
                </p>
              </section>
            </div>

            <div className="flex shrink-0 flex-col gap-2 border-t border-black/10 bg-white p-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                disabled={guardando}
                onClick={handleGuardar}
                className={`${boton} ${
                  totalPrendas === 0
                    ? 'bg-peligro text-black hover:bg-peligro/80'
                    : 'bg-black text-white hover:bg-black/85'
                }`}
              >
                {guardando
                  ? 'Guardando…'
                  : totalPrendas === 0
                    ? 'Borrar esta compra'
                    : 'Guardar cambios'}
              </button>

              <button
                type="button"
                disabled={guardando}
                onClick={onCerrar}
                className={`${boton} bg-fondo text-black hover:bg-black/5`}
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
