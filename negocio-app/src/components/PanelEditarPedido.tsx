import { useEffect, useId, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Minus, Plus, Trash2, X } from 'lucide-react'
import { Aviso } from './Aviso.tsx'
import { CLAVE_PRECIOS } from '../lib/cacheLectura.ts'
import { formatearDolares, redondear2 } from '../lib/dinero.ts'
import { agruparPorPrecio, type GrupoPrecio, type ItemCanasta } from '../lib/reglas.ts'
import { useDatos } from '../lib/useDatos.ts'
import { transicionDesplegar } from './PanelDesplegable.tsx'
import { editarPedidoFecha } from '../services/canasta.ts'
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

export function PanelEditarPedido({
  pedido,
  abierto,
  onCerrar,
  onGuardado,
}: PanelEditarPedidoProps) {
  const tituloId = useId()
  const reducirMovimiento = useReducedMotion()
  const { datos: catalogoPrecios } = useDatos(CLAVE_PRECIOS, () => listarPrecios())

  const [lineas, setLineas] = useState<ItemCanasta[]>([])
  const [otroValor, setOtroValor] = useState('')
  const [errorOtroValor, setErrorOtroValor] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null)

  // Al abrir un nuevo pedido, inicializar las líneas desde sus grupos
  useEffect(() => {
    if (abierto && pedido) {
      setLineas(pedido.grupos.map((g) => ({ precio: g.precio, cantidad: g.cantidad })))
      setOtroValor('')
      setErrorOtroValor(null)
      setErrorGuardado(null)
      setGuardando(false)
    }
  }, [abierto, pedido])

  // Cerrar con tecla Escape
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

  if (!pedido) return null

  const totalPrendas = lineas.reduce((acc, l) => acc + l.cantidad, 0)
  const totalMonto = redondear2(lineas.reduce((acc, l) => acc + l.precio * l.cantidad, 0))
  const gruposOrdenados = [...agruparPorPrecio(lineas)].sort((a, b) => a.precio - b.precio)
  const preciosOrdenados = [...(catalogoPrecios ?? [])].sort((a, b) => a.valor - b.valor)

  function cambiarCantidad(precio: number, delta: number) {
    setLineas((prev) => {
      const indice = prev.findIndex((item) => item.precio === precio)
      if (indice === -1) {
        if (delta > 0) return [...prev, { precio, cantidad: delta }]
        return prev
      }
      const actual = prev[indice]!
      const nuevaCantidad = actual.cantidad + delta
      if (nuevaCantidad <= 0) {
        return prev.filter((_, i) => i !== indice)
      }
      const copia = [...prev]
      copia[indice] = { ...actual, cantidad: nuevaCantidad }
      return copia
    })
  }

  function eliminarLinea(precio: number) {
    setLineas((prev) => prev.filter((item) => item.precio !== precio))
  }

  function agregarPrecio(precio: number) {
    cambiarCantidad(precio, 1)
  }

  function agregarOtroPrecio(e: FormEvent) {
    e.preventDefault()
    setErrorOtroValor(null)
    const limpio = otroValor.trim().replace(',', '.')
    const valor = Number(limpio)
    if (!Number.isFinite(valor) || valor <= 0) {
      setErrorOtroValor('Ingresa un precio mayor que 0.')
      return
    }
    agregarPrecio(redondear2(valor))
    setOtroValor('')
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
          className="fixed inset-0 z-50 flex items-end justify-center"
        >
          {/* Fondo oscuro para cerrar */}
          <button
            type="button"
            aria-label="Cerrar panel de edición"
            disabled={guardando}
            onClick={() => {
              if (!guardando) onCerrar()
            }}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs"
          />

          {/* Panel inferior sobrepuesto (bottom sheet) */}
          <motion.div
            initial={reducirMovimiento ? false : { opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducirMovimiento ? undefined : { opacity: 0, y: 36 }}
            transition={transicion}
            className="relative z-10 flex max-h-[min(90dvh,46rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl"
          >
            {/* Cabecera */}
            <div className="flex shrink-0 items-center justify-between border-b border-black/10 px-5 py-4">
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

            {/* Contenido scrolleable */}
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
              {errorGuardado ? <Aviso tono="error">{errorGuardado}</Aviso> : null}

              {/* Lista de prendas del pedido */}
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold tracking-wide text-black/70 uppercase">
                  Prendas de este día
                </h3>

                {lineas.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-black/20 p-4 text-center text-sm text-black/60">
                    No hay prendas. Si guardas ahora, se borrará el pedido de esta fecha.
                  </div>
                ) : (
                  <ul className="flex flex-col gap-2.5">
                    {gruposOrdenados.map((grupo) => (
                      <li
                        key={grupo.precio}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-fondo p-3.5"
                      >
                        <div className="flex min-w-0 flex-col">
                          <span className="text-base font-bold tabular-nums">
                            {formatearDolares(grupo.precio)}
                          </span>
                          <span className="text-xs text-black/60 tabular-nums">
                            Subtotal: {formatearDolares(grupo.subtotal)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            aria-label={`Quitar una de ${formatearDolares(grupo.precio)}`}
                            disabled={guardando}
                            onClick={() => cambiarCantidad(grupo.precio, -1)}
                            className="inline-flex size-10 shrink-0 touch-manipulation items-center justify-center rounded-full bg-black/10 text-black hover:bg-black/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-40"
                          >
                            <Minus size={18} aria-hidden />
                          </button>

                          <span className="w-8 text-center text-base font-bold tabular-nums">
                            {grupo.cantidad}
                          </span>

                          <button
                            type="button"
                            aria-label={`Agregar una de ${formatearDolares(grupo.precio)}`}
                            disabled={guardando}
                            onClick={() => cambiarCantidad(grupo.precio, 1)}
                            className="inline-flex size-10 shrink-0 touch-manipulation items-center justify-center rounded-full bg-black text-white hover:bg-black/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-40"
                          >
                            <Plus size={18} aria-hidden />
                          </button>

                          <button
                            type="button"
                            aria-label={`Eliminar todas de ${formatearDolares(grupo.precio)}`}
                            disabled={guardando}
                            onClick={() => eliminarLinea(grupo.precio)}
                            className="ml-1 inline-flex size-10 shrink-0 touch-manipulation items-center justify-center rounded-full bg-peligro/30 text-black hover:bg-peligro/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-40"
                          >
                            <Trash2 size={16} aria-hidden />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Añadir prendas */}
              <div className="flex flex-col gap-3 rounded-2xl border border-black/10 p-4">
                <h3 className="text-sm font-semibold tracking-wide text-black/70 uppercase">
                  Añadir prenda
                </h3>

                {/* Precios rápidos de catálogo */}
                {catalogoPrecios && catalogoPrecios.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {preciosOrdenados.map((precio) => (
                      <button
                        key={precio.id}
                        type="button"
                        disabled={guardando}
                        onClick={() => agregarPrecio(precio.valor)}
                        className="inline-flex min-h-10 touch-manipulation items-center gap-1.5 rounded-full bg-fondo px-3.5 py-1.5 text-sm font-semibold text-black hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-40"
                      >
                        <Plus size={14} aria-hidden />
                        {formatearDolares(precio.valor)}
                      </button>
                    ))}
                  </div>
                ) : null}

                {/* Agregar otro valor personalizado */}
                <form onSubmit={agregarOtroPrecio} className="mt-1 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Otro valor (ej. 4.50)"
                      value={otroValor}
                      disabled={guardando}
                      onChange={(e) => {
                        setOtroValor(e.target.value)
                        if (errorOtroValor) setErrorOtroValor(null)
                      }}
                      className="min-h-11 flex-1 rounded-full border border-black/20 bg-fondo px-4 text-sm text-black placeholder:text-black/40 focus:border-black focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={guardando || !otroValor.trim()}
                      className="inline-flex min-h-11 touch-manipulation items-center justify-center rounded-full bg-black px-4 text-sm font-semibold text-white hover:bg-black/85 disabled:opacity-40"
                    >
                      Añadir
                    </button>
                  </div>
                  {errorOtroValor ? <p className="text-xs text-red-600">{errorOtroValor}</p> : null}
                </form>
              </div>

              {/* Resumen recalculado */}
              <div className="flex items-center justify-between rounded-2xl bg-black/5 px-4 py-3">
                <span className="text-sm font-medium text-black/70">
                  Cant. prendas:{' '}
                  <strong className="text-base font-bold text-black tabular-nums">
                    {totalPrendas}
                  </strong>
                </span>
                <span className="text-sm font-medium text-black/70">
                  Total día:{' '}
                  <strong className="text-base font-bold text-black tabular-nums">
                    {formatearDolares(totalMonto)}
                  </strong>
                </span>
              </div>
            </div>

            {/* Acciones inferiores */}
            <div className="flex shrink-0 flex-col gap-2 border-t border-black/10 p-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
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
                    ? 'Eliminar pedido de esta fecha'
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
