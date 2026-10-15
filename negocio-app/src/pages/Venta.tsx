import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Minus, Plus, Shirt, ShoppingBasket } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Aviso } from '../components/Aviso.tsx'
import { EtiquetaEstado } from '../components/EtiquetaEstado.tsx'
import { IndicadorCarga } from '../components/IndicadorCarga.tsx'
import { Layout } from '../components/Layout.tsx'
import { secciones } from '../config/secciones.ts'
import { useConexion } from '../context/useConexion.ts'
import { CLAVE_CLIENTES, CLAVE_PRECIOS, claveCanastaCliente, guardarCache, leerCache, pedirDatos } from '../lib/cacheLectura.ts'
import { coincideCliente } from '../lib/busqueda.ts'
import { codificarVenta } from '../lib/compartir.ts'
import { MENSAJE_FALLO_RED } from '../lib/conexion.ts'
import { subirAlInicio } from '../lib/dispositivo.ts'
import { useDatos } from '../lib/useDatos.ts'
import { formatearDolares, redondear2 } from '../lib/dinero.ts'
import { agruparPorPrecio, puedeVender, totalCanasta, type GrupoPrecio, type ItemCanasta } from '../lib/reglas.ts'
import { borrarMenuVenta, guardarMenuVenta, leerMenuVenta } from '../lib/ventaConfirmada.ts'
import {
  agregarItemsCanasta,
  leerCantidadEntera,
  MENSAJE_CLIENTE_INACTIVO,
  textoCantidadEntera,
  obtenerCanasta,
  type FilaCanasta,
} from '../services/canasta.ts'
import { listarClientes, obtenerCliente, type Cliente, type ClienteVenta } from '../services/clientes.ts'
import { listarPrecios, type Precio } from '../services/precios.ts'

type Paso = 'buscar' | 'prendas' | 'resumen' | 'confirmado'
type AvisoEstado = { texto: string; tono: 'ok' | 'error' }
type LineaTemporal = { id: string; precio: number; cantidad: number }

const titulos: Record<Paso, string> = {
  buscar: 'Buscar cliente',
  prendas: 'Elegir prendas',
  resumen: 'Resumen',
  confirmado: 'Pedido confirmado',
}

const numeros: Record<Paso, number> = {
  buscar: 1,
  prendas: 2,
  resumen: 3,
  confirmado: 4,
}

const boton =
  'inline-flex min-h-12 w-full touch-manipulation items-center justify-center rounded-full px-5 py-3 text-base [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50'

const toque = { scale: 0.97 }
const Enlace = motion.create(Link)
const consultaPc = '(min-width: 980px)'

function usePantallaPc() {
  const [esPc, setEsPc] = useState(() => window.matchMedia(consultaPc).matches)

  useEffect(() => {
    const media = window.matchMedia(consultaPc)
    const alCambiar = () => setEsPc(media.matches)
    media.addEventListener('change', alCambiar)
    return () => media.removeEventListener('change', alCambiar)
  }, [])

  return esPc
}

function textoPrendas(prendas: number) {
  if (prendas <= 0) return null
  return prendas === 1 ? '1 prenda pedida' : `${prendas} prendas pedidas`
}

export function Venta() {
  const { nombre, subtitulo, acento } = secciones.venta
  const { enLinea } = useConexion()
  const esPc = usePantallaPc()
  const reducirMovimiento = useReducedMotion()
  const refPaso = useRef<HTMLHeadingElement>(null)
  const eligiendo = useRef(false)
  const confirmando = useRef(false)
  const pedidoCanasta = useRef(0)

  const [paso, setPaso] = useState<Paso>('buscar')
  const [aviso, setAviso] = useState<AvisoEstado | null>(null)
  const [bloqueo, setBloqueo] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [recargaClientes, setRecargaClientes] = useState(0)
  const [recargaPrecios, setRecargaPrecios] = useState(0)
  const listaClientes = useDatos(CLAVE_CLIENTES, () => listarClientes(), recargaClientes)
  const listaPrecios = useDatos(CLAVE_PRECIOS, () => listarPrecios(), recargaPrecios)
  const consulta = busqueda.trim()
  const clientes = useMemo(
    () => (listaClientes.datos ?? []).filter((fila) => coincideCliente(consulta, fila.codigo, fila.nombre)),
    [consulta, listaClientes.datos],
  )
  const cargandoClientes = listaClientes.esperando && clientes.length === 0
  const errorBusqueda = listaClientes.error
  const precios = listaPrecios.datos ?? []
  const cargandoPrecios = listaPrecios.esperando && precios.length === 0
  const errorPrecios = listaPrecios.error
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [precioElegido, setPrecioElegido] = useState<number | null>(null)
  const [textoCantidad, setTextoCantidad] = useState('')
  const [lineas, setLineas] = useState<LineaTemporal[]>([])
  const [ventaConfirmada, setVentaConfirmada] = useState<ItemCanasta[]>([])
  const [canasta, setCanasta] = useState<FilaCanasta[] | null>(null)
  const [cargandoCanasta, setCargandoCanasta] = useState(false)
  const [errorCanasta, setErrorCanasta] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [restaurando, setRestaurando] = useState(() => leerMenuVenta() != null)

  useEffect(() => {
    const guardada = leerMenuVenta()
    if (!guardada) {
      setRestaurando(false)
      return
    }
    let vigente = true
    void (async () => {
      const resultado = await obtenerCliente(guardada.clienteId)
      if (!vigente) return
      if (!resultado.ok) {
        borrarMenuVenta()
        setRestaurando(false)
        return
      }
      setCliente(resultado.datos)
      setVentaConfirmada(guardada.venta)
      setPaso('confirmado')
      setRestaurando(false)
    })()
    return () => {
      vigente = false
    }
  }, [])

  function mostrar(texto: string, tono: AvisoEstado['tono']) {
    setAviso({ texto, tono })
    subirAlInicio()
  }

  function elegirCliente(opcion: Cliente) {
    if (eligiendo.current) return
    if (!puedeVender(opcion.estado)) {
      setBloqueo(MENSAJE_CLIENTE_INACTIVO)
      subirAlInicio()
      return
    }

    eligiendo.current = true
    setAviso(null)
    setBloqueo(null)
    if (cliente && cliente.id !== opcion.id) {
      setLineas([])
      setPrecioElegido(null)
      setTextoCantidad('')
    }
    setCliente(opcion)
    setPaso('prendas')
    eligiendo.current = false

    void obtenerCliente(opcion.id).then((resultado) => {
      if (!resultado.ok) return
      setCliente((actual) => (actual?.id === opcion.id ? resultado.datos : actual))
      if (!puedeVender(resultado.datos.estado)) {
        setPaso('buscar')
        setBloqueo(MENSAJE_CLIENTE_INACTIVO)
        subirAlInicio()
      }
    })
  }

  function agregarLinea(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (precioElegido == null) return
    const cantidad = leerCantidadEntera(textoCantidad)
    if (cantidad == null) return
    const precio = redondear2(precioElegido)
    setLineas((actuales) => {
      const existente = actuales.find((linea) => redondear2(linea.precio) === precio)
      if (!existente) {
        return [...actuales, { id: crypto.randomUUID(), precio, cantidad }]
      }
      const siguiente = existente.cantidad + cantidad
      if (!Number.isSafeInteger(siguiente)) return actuales
      return actuales.map((linea) =>
        linea.id === existente.id ? { ...linea, cantidad: siguiente } : linea,
      )
    })
    setTextoCantidad('')
  }

  function quitarLinea(id: string) {
    setLineas((actuales) => actuales.filter((linea) => linea.id !== id))
  }

  function cambiarCantidad(id: string, delta: number) {
    setLineas((actuales) =>
      actuales.map((linea) => {
        if (linea.id !== id) return linea
        const siguiente = linea.cantidad + delta
        if (!Number.isSafeInteger(siguiente) || siguiente < 1) return linea
        return { ...linea, cantidad: siguiente }
      }),
    )
  }

  async function cargarCanasta(clienteId: string) {
    const id = ++pedidoCanasta.current
    const clave = claveCanastaCliente(clienteId)
    const guardada = leerCache<FilaCanasta[]>(clave)
    if (guardada) {
      setCanasta(guardada)
      setCargandoCanasta(false)
    } else {
      setCargandoCanasta(true)
    }
    setErrorCanasta(null)
    const resultado = await pedirDatos(clave, () => obtenerCanasta(clienteId), { fresco: true })
    if (pedidoCanasta.current !== id) return
    setCargandoCanasta(false)
    if (!resultado.ok) {
      if (!guardada) {
        setCanasta(null)
        setErrorCanasta(resultado.mensaje)
      }
      return
    }
    guardarCache(clave, resultado.datos)
    setCanasta(resultado.datos)
  }

  function irAResumen() {
    if (!cliente || lineas.length === 0) return
    setAviso(null)
    setPaso('resumen')
    void cargarCanasta(cliente.id)
  }

  async function confirmar() {
    if (!cliente || lineas.length === 0 || confirmando.current) return
    if (!enLinea) {
      mostrar(MENSAJE_FALLO_RED, 'error')
      return
    }
    confirmando.current = true
    setGuardando(true)
    setAviso(null)
    const resultado = await agregarItemsCanasta(
      cliente.id,
      lineas.map((linea) => ({ precio: linea.precio, cantidad: linea.cantidad })),
    )
    confirmando.current = false
    setGuardando(false)
    if (!resultado.ok) {
      mostrar(resultado.mensaje, 'error')
      return
    }
    const venta = lineas.map((linea) => ({ precio: linea.precio, cantidad: linea.cantidad }))
    guardarMenuVenta(cliente.id, venta)
    setVentaConfirmada(venta)
    setLineas([])
    setPrecioElegido(null)
    setTextoCantidad('')
    setPaso('confirmado')
  }

  function registrarOtraVenta() {
    borrarMenuVenta()
    setAviso(null)
    setBloqueo(null)
    setCliente(null)
    setLineas([])
    setVentaConfirmada([])
    setPrecioElegido(null)
    setTextoCantidad('')
    setCanasta(null)
    setErrorCanasta(null)
    setPaso('buscar')
  }

  const cantidad = precioElegido == null ? null : leerCantidadEntera(textoCantidad)
  const subtotal =
    precioElegido != null && cantidad != null
      ? totalCanasta([{ precio: precioElegido, cantidad }])
      : null
  const errorCantidad =
    textoCantidad.trim() !== '' && cantidad == null
      ? 'La cantidad debe ser un entero mayor que 0.'
      : null
  const grupos = agruparPorPrecio(lineas)
  const totalVenta = totalCanasta(lineas)
  const totalCanastaCliente = canasta ? totalCanasta([...canasta, ...lineas]) : null

  return (
    <Layout titulo={nombre} subtitulo={subtitulo} acento={acento}>
      {aviso ? <Aviso tono={aviso.tono}>{aviso.texto}</Aviso> : null}
      {paso === 'buscar' && !restaurando && bloqueo ? <Aviso>{bloqueo}</Aviso> : null}
      {restaurando ? <IndicadorCarga>Cargando el pedido…</IndicadorCarga> : null}

      {restaurando ? null : (
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={paso}
          initial={reducirMovimiento ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducirMovimiento ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={reducirMovimiento ? { duration: 0 } : { duration: 0.2 }}
          onAnimationComplete={() => refPaso.current?.focus()}
          className="flex flex-col gap-5"
        >
          <div>
            <p className="text-sm text-black/60">Paso {numeros[paso]} de 4</p>
            <h2
              ref={refPaso}
              tabIndex={-1}
              role={paso === 'confirmado' ? 'status' : undefined}
              className={`mt-1 font-display text-2xl uppercase tracking-wide outline-none lg:text-4xl ${paso === 'confirmado' ? 'rounded-3xl bg-afirmar px-5 py-4 leading-tight' : 'leading-none'}`}
            >
              {titulos[paso]}
            </h2>
          </div>

          {paso === 'buscar' ? (
            <PasoBuscar
              busqueda={busqueda}
              consulta={consulta}
              clientes={clientes}
              cargando={cargandoClientes}
              error={errorBusqueda}
              revisandoId={null}
              esPc={esPc}
              acento={acento}
              onBusqueda={(valor) => {
                setBusqueda(valor)
                setBloqueo(null)
              }}
              onBuscarYa={() => {}}
              onElegir={(opcion) => void elegirCliente(opcion)}
              onReintentar={() => setRecargaClientes((valor) => valor + 1)}
            />
          ) : null}

          {paso === 'prendas' && cliente ? (
            <PasoPrendas
              cliente={cliente}
              acento={acento}
              precios={precios}
              cargandoPrecios={cargandoPrecios}
              errorPrecios={errorPrecios}
              precioElegido={precioElegido}
              textoCantidad={textoCantidad}
              errorCantidad={errorCantidad}
              subtotal={subtotal}
              lineas={lineas}
              totalVenta={totalVenta}
              onCambiarCliente={() => {
                setAviso(null)
                setPaso('buscar')
              }}
              onElegirPrecio={(valor) => {
                setPrecioElegido(valor)
                setTextoCantidad('')
              }}
              onCantidad={setTextoCantidad}
              onAgregar={agregarLinea}
              onQuitar={quitarLinea}
              onCambiarCantidad={cambiarCantidad}
              onReintentarPrecios={() => setRecargaPrecios((valor) => valor + 1)}
              onGuardar={irAResumen}
            />
          ) : null}

          {paso === 'resumen' && cliente ? (
            <PasoResumen
              cliente={cliente}
              grupos={grupos}
              totalVenta={totalVenta}
              totalCanastaCliente={totalCanastaCliente}
              cargandoCanasta={cargandoCanasta}
              errorCanasta={errorCanasta}
              guardando={guardando}
              enLinea={enLinea}
              onAtras={() => {
                setAviso(null)
                setPaso('prendas')
              }}
              onConfirmar={() => void confirmar()}
              onReintentarCanasta={() => void cargarCanasta(cliente.id)}
            />
          ) : null}

          {paso === 'confirmado' && cliente ? (
            <PasoConfirmado
              cliente={cliente}
              venta={ventaConfirmada}
              onOtraVenta={registrarOtraVenta}
            />
          ) : null}
        </motion.div>
      </AnimatePresence>
      )}
    </Layout>
  )
}

function PasoBuscar({
  busqueda,
  consulta,
  clientes,
  cargando,
  error,
  revisandoId,
  esPc,
  acento,
  onBusqueda,
  onBuscarYa,
  onElegir,
  onReintentar,
}: {
  busqueda: string
  consulta: string
  clientes: ClienteVenta[]
  cargando: boolean
  error: string | null
  revisandoId: string | null
  esPc: boolean
  acento: string
  onBusqueda: (valor: string) => void
  onBuscarYa: () => void
  onElegir: (cliente: Cliente) => void
  onReintentar: () => void
}) {
  const idBusqueda = useId()
  const reducirMovimiento = useReducedMotion()
  const sinResultados = !cargando && clientes.length === 0 && !error

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-2"
        onSubmit={(evento) => {
          evento.preventDefault()
          onBuscarYa()
        }}
      >
        <label className="text-sm" htmlFor={idBusqueda}>
          Buscar
        </label>
        <input
          id={idBusqueda}
          type="search"
          enterKeyHint="search"
          value={busqueda}
          placeholder="Código o nombre"
          onChange={(evento) => onBusqueda(evento.target.value)}
          className="rounded-full bg-white px-5 py-4 text-base shadow-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        />
      </form>

      {cargando ? <IndicadorCarga>Cargando clientes…</IndicadorCarga> : null}

      {error ? (
        <div className="flex flex-col gap-3">
          <Aviso>{error}</Aviso>
          <button type="button" onClick={onReintentar} className={`${boton} bg-black text-white`}>
            Reintentar
          </button>
        </div>
      ) : null}

      {sinResultados ? (
        <p className={esPc ? 'text-base' : 'rounded-3xl bg-white px-5 py-8 text-center shadow-sm'}>
          {consulta ? 'Ningún cliente coincide con la búsqueda.' : 'Aún no hay clientes'}
        </p>
      ) : null}

      {clientes.length > 0 && esPc ? (
        <TablaClientesVenta
          clientes={clientes}
          acento={acento}
          revisandoId={revisandoId}
          onElegir={onElegir}
        />
      ) : null}

      {clientes.length > 0 && !esPc ? (
        <ul className="flex flex-col gap-2">
          {clientes.map((cliente) => {
            const prendas = textoPrendas(cliente.prendas)
            return (
              <li key={cliente.id}>
                <motion.button
                  type="button"
                  onClick={() => onElegir(cliente)}
                  disabled={revisandoId !== null}
                  whileTap={reducirMovimiento || revisandoId !== null ? undefined : toque}
                  transition={{ duration: 0.15 }}
                  className="flex w-full touch-manipulation items-center justify-between gap-3 rounded-3xl bg-white px-4 py-3 text-left shadow-sm [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="shrink-0 font-display text-2xl uppercase leading-none tracking-wide">
                        {cliente.codigo}
                      </span>
                      <span className="min-w-0 truncate text-sm">{cliente.nombre ?? '\u00a0'}</span>
                    </span>
                    {prendas ? <span className="mt-1 block text-sm text-black/60">{prendas}</span> : null}
                    {revisandoId === cliente.id ? <span className="mt-1 block text-sm">Revisando…</span> : null}
                  </span>
                  <EtiquetaEstado estado={cliente.estado} />
                </motion.button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

function TablaClientesVenta({
  clientes,
  acento,
  revisandoId,
  onElegir,
}: {
  clientes: ClienteVenta[]
  acento: string
  revisandoId: string | null
  onElegir: (cliente: Cliente) => void
}) {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left lg:[&_td]:px-5 lg:[&_td]:py-4 lg:[&_th]:px-5 lg:[&_th]:py-4">
          <caption className="sr-only">Clientes</caption>
          <thead>
            <tr className="text-sm" style={{ backgroundColor: acento }}>
              <th scope="col" className="px-4 py-3 font-semibold">
                Código
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Nombre
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Prendas
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((cliente) => (
              <tr
                key={cliente.id}
                className="cursor-pointer border-b border-black/10 hover:bg-black/[0.03]"
                onClick={() => {
                  if (revisandoId !== null) return
                  onElegir(cliente)
                }}
              >
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={revisandoId !== null}
                    onClick={() => onElegir(cliente)}
                    className="break-words text-left font-display text-2xl uppercase leading-none tracking-wide focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50"
                  >
                    {cliente.codigo}
                  </button>
                </td>
                <td className="px-4 py-3">{cliente.nombre ?? 'Sin nombre'}</td>
                <td className="px-4 py-3 text-black/70">{textoPrendas(cliente.prendas) ?? '—'}</td>
                <td className="px-4 py-3">
                  <EtiquetaEstado estado={cliente.estado} />
                  {revisandoId === cliente.id ? <span className="mt-1 block text-sm">Revisando…</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PasoPrendas({
  cliente,
  acento,
  precios,
  cargandoPrecios,
  errorPrecios,
  precioElegido,
  textoCantidad,
  errorCantidad,
  subtotal,
  lineas,
  totalVenta,
  onCambiarCliente,
  onElegirPrecio,
  onCantidad,
  onAgregar,
  onQuitar,
  onCambiarCantidad,
  onReintentarPrecios,
  onGuardar,
}: {
  cliente: Cliente
  acento: string
  precios: Precio[]
  cargandoPrecios: boolean
  errorPrecios: string | null
  precioElegido: number | null
  textoCantidad: string
  errorCantidad: string | null
  subtotal: number | null
  lineas: LineaTemporal[]
  totalVenta: number
  onCambiarCliente: () => void
  onElegirPrecio: (valor: number) => void
  onCantidad: (valor: string) => void
  onAgregar: (evento: FormEvent<HTMLFormElement>) => void
  onQuitar: (id: string) => void
  onCambiarCantidad: (id: string, delta: number) => void
  onReintentarPrecios: () => void
  onGuardar: () => void
}) {
  const idCantidad = useId()
  const idError = useId()
  const refCantidad = useRef<HTMLInputElement>(null)
  const refFormulario = useRef<HTMLFormElement>(null)
  const reducirMovimiento = useReducedMotion()

  useEffect(() => {
    if (precioElegido == null) return
    const esCelular = window.matchMedia('(max-width: 979px)').matches
    if (esCelular) {
      refFormulario.current?.scrollIntoView({
        behavior: reducirMovimiento ? 'auto' : 'smooth',
        block: 'start',
      })
    }
    refCantidad.current?.focus({ preventScroll: esCelular })
  }, [precioElegido, reducirMovimiento])

  const cantidadActual = leerCantidadEntera(textoCantidad)

  function ajustarCantidad(delta: 1 | -1) {
    const actual = cantidadActual ?? 0
    const siguiente = actual + delta
    if (siguiente < 1 || !Number.isSafeInteger(siguiente)) return
    onCantidad(String(siguiente))
  }

  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:items-start lg:gap-8">
      <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <FichaCliente cliente={cliente} />
        </div>
        <button
          type="button"
          onClick={onCambiarCliente}
          className="inline-flex min-h-12 shrink-0 touch-manipulation items-center justify-center rounded-full bg-black/5 px-4 text-sm [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          Cambiar cliente
        </button>
      </div>

      {cargandoPrecios ? <IndicadorCarga>Cargando valores…</IndicadorCarga> : null}

      {errorPrecios ? (
        <div className="flex flex-col gap-3">
          <Aviso>{errorPrecios}</Aviso>
          <button type="button" onClick={onReintentarPrecios} className={`${boton} bg-black text-white`}>
            Reintentar
          </button>
        </div>
      ) : null}

      {!cargandoPrecios && !errorPrecios && precios.length === 0 ? (
        <div className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-base leading-relaxed">Todavía no hay valores. Agrégalos en Catálogo.</p>
          <Enlace
            to="/catalogo"
            whileTap={reducirMovimiento ? undefined : toque}
            transition={{ duration: 0.15 }}
            className={`${boton} bg-black text-white`}
          >
            Ir a Catálogo
          </Enlace>
        </div>
      ) : null}

      {precios.length > 0 ? (
        <div role="group" aria-label="Valores de prenda" className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
          {precios.map((precio) => {
            const elegido = precio.valor === precioElegido
            const monto = formatearDolares(precio.valor)
            return (
              <motion.button
                key={precio.id}
                type="button"
                aria-pressed={elegido}
                onClick={() => onElegirPrecio(precio.valor)}
                whileTap={reducirMovimiento ? undefined : toque}
                transition={{ duration: 0.15 }}
                className="flex min-h-14 touch-manipulation items-center justify-center rounded-full px-3 font-display text-2xl leading-none tracking-wide [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black lg:min-h-24 lg:text-4xl"
                style={{ backgroundColor: elegido ? '#000' : acento, color: elegido ? '#fff' : '#000' }}
              >
                {monto}
              </motion.button>
            )
          })}
        </div>
      ) : null}

      {precioElegido != null ? (
        <form
          ref={refFormulario}
          className="flex scroll-mt-4 flex-col gap-3 rounded-3xl bg-white p-5 shadow-sm"
          noValidate
          onSubmit={onAgregar}
        >
          <p className="text-sm">Cantidad de {formatearDolares(precioElegido)}</p>
          <div className="flex flex-col gap-2">
            <label className="text-sm" htmlFor={idCantidad}>
              Cantidad
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Menos"
                disabled={cantidadActual == null || cantidadActual <= 1}
                onClick={() => ajustarCantidad(-1)}
                className="inline-flex size-14 shrink-0 touch-manipulation items-center justify-center rounded-full text-black [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-40"
                style={{ backgroundColor: acento }}
              >
                <Minus aria-hidden size={22} strokeWidth={2} />
              </button>
              <input
                ref={refCantidad}
                id={idCantidad}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                enterKeyHint="done"
                value={textoCantidad}
                aria-invalid={errorCantidad ? true : undefined}
                aria-describedby={errorCantidad ? idError : undefined}
                onChange={(evento) => onCantidad(textoCantidadEntera(evento.target.value))}
                className="min-w-0 flex-1 rounded-full bg-fondo px-5 py-4 text-center text-base outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              />
              <button
                type="button"
                aria-label="Más"
                disabled={cantidadActual != null && !Number.isSafeInteger(cantidadActual + 1)}
                onClick={() => ajustarCantidad(1)}
                className="inline-flex size-14 shrink-0 touch-manipulation items-center justify-center rounded-full bg-afirmar text-black [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-40"
              >
                <Plus aria-hidden size={22} strokeWidth={2} />
              </button>
            </div>
            {errorCantidad ? (
              <p id={idError} role="alert" className="text-sm">
                {errorCantidad}
              </p>
            ) : null}
          </div>
          <p aria-live="polite" className="flex items-baseline justify-between gap-3 text-base">
            <span>Subtotal</span>
            <span className="font-display text-3xl leading-none tracking-wide">
              {subtotal == null ? (
                '—'
              ) : (
                <NumeroAnimado valor={subtotal} texto={formatearDolares(subtotal)} />
              )}
            </span>
          </p>
          <button type="submit" disabled={subtotal == null} className={`${boton} bg-black text-white`}>
            Agregar
          </button>
        </form>
      ) : null}
      </div>

      <div className="flex flex-col gap-5 lg:sticky lg:top-8">
      <ListaTemporal
        lineas={lineas}
        totalVenta={totalVenta}
        onQuitar={onQuitar}
        onCambiarCantidad={onCambiarCantidad}
      />

      <button
        type="button"
        onClick={onGuardar}
        disabled={lineas.length === 0}
        className={`${boton} bg-black text-white`}
      >
        Guardar
      </button>
      </div>
    </div>
  )
}

function PasoResumen({
  cliente,
  grupos,
  totalVenta,
  totalCanastaCliente,
  cargandoCanasta,
  errorCanasta,
  guardando,
  enLinea,
  onAtras,
  onConfirmar,
  onReintentarCanasta,
}: {
  cliente: Cliente
  grupos: GrupoPrecio[]
  totalVenta: number
  totalCanastaCliente: number | null
  cargandoCanasta: boolean
  errorCanasta: string | null
  guardando: boolean
  enLinea: boolean
  onAtras: () => void
  onConfirmar: () => void
  onReintentarCanasta: () => void
}) {
  return (
    <div className="flex flex-col gap-5">
      <FichaCliente cliente={cliente} />
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:items-start lg:gap-8">
      <section className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm lg:p-8">
        <h3 className="text-base">Prendas</h3>
        <ul className="flex flex-col gap-3">
          {grupos.map((grupo) => (
            <li key={grupo.precio} className="flex items-baseline justify-between gap-3">
              <span>
                {formatearDolares(grupo.precio)} × {grupo.cantidad}
              </span>
              <span>{formatearDolares(grupo.subtotal)}</span>
            </li>
          ))}
        </ul>
        <p className="flex items-baseline justify-between gap-3">
          <span>Total de la venta</span>
          <span className="font-display text-3xl leading-none tracking-wide">{formatearDolares(totalVenta)}</span>
        </p>
        <div className="flex flex-col gap-2">
          <p className="flex items-baseline justify-between gap-3">
            <span>Total de la canasta</span>
            <span className="font-display text-3xl leading-none tracking-wide">
              {cargandoCanasta || totalCanastaCliente == null ? '—' : formatearDolares(totalCanastaCliente)}
            </span>
          </p>
          {cargandoCanasta ? <IndicadorCarga>Cargando canasta…</IndicadorCarga> : null}
          {errorCanasta ? (
            <div className="flex flex-col gap-3">
              <Aviso>{errorCanasta}</Aviso>
              <button type="button" onClick={onReintentarCanasta} className={`${boton} bg-black/5`}>
                Reintentar
              </button>
            </div>
          ) : null}
          {!cargandoCanasta && !errorCanasta ? (
            <p className="text-sm leading-relaxed text-black/60">
              Incluye lo que ya tenía y esta venta.
            </p>
          ) : null}
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
        <button type="button" onClick={onAtras} disabled={guardando} className={`${boton} bg-black/5`}>
          Atrás
        </button>
        <button
          type="button"
          onClick={onConfirmar}
          disabled={guardando || grupos.length === 0 || !enLinea}
          className={`${boton} bg-black text-white`}
        >
          {guardando ? 'Guardando…' : 'Confirmar'}
        </button>
      </div>
      </div>
    </div>
  )
}

function PasoConfirmado({
  cliente,
  venta,
  onOtraVenta,
}: {
  cliente: Cliente
  venta: ItemCanasta[]
  onOtraVenta: () => void
}) {
  const reducirMovimiento = useReducedMotion()
  const rutaVenta = `/compartir/${cliente.id}?venta=${encodeURIComponent(codificarVenta(venta))}`

  return (
    <div className="flex flex-col gap-5 lg:max-w-xl">
      <FichaCliente cliente={cliente} />
      {venta.length > 0 ? (
        <Enlace
          to={rutaVenta}
          state={{ desde: 'venta' }}
          whileTap={reducirMovimiento ? undefined : toque}
          transition={{ duration: 0.15 }}
          className={`${boton} gap-2 bg-black text-white`}
        >
          <Shirt aria-hidden size={18} strokeWidth={2} />
          Compartir esta venta
        </Enlace>
      ) : null}
      <Enlace
        to={`/compartir/${cliente.id}?desde=venta`}
        state={{ desde: 'venta' }}
        whileTap={reducirMovimiento ? undefined : toque}
        transition={{ duration: 0.15 }}
        className={`${boton} gap-2 bg-black text-white`}
      >
        <ShoppingBasket aria-hidden size={18} strokeWidth={2} />
        Compartir total
      </Enlace>
      <motion.button
        type="button"
        onClick={onOtraVenta}
        whileTap={reducirMovimiento ? undefined : toque}
        transition={{ duration: 0.15 }}
        className={`${boton} bg-afirmar`}
      >
        Registrar otra venta
      </motion.button>
      <Enlace
        to="/"
        onClick={() => borrarMenuVenta()}
        whileTap={reducirMovimiento ? undefined : toque}
        transition={{ duration: 0.15 }}
        className={`${boton} bg-black/5`}
      >
        Salir
      </Enlace>
    </div>
  )
}

function FichaCliente({ cliente }: { cliente: Cliente }) {
  return (
    <p className="rounded-3xl bg-white px-5 py-4 shadow-sm">
      <span className="block font-display text-2xl uppercase leading-none tracking-wide lg:text-4xl">{cliente.codigo}</span>
      {cliente.nombre ? <span className="mt-2 block break-words text-sm">{cliente.nombre}</span> : null}
    </p>
  )
}

const variantesNumero = {
  inicial: (direccion: number) => ({
    y: direccion > 0 ? 12 : -12,
    opacity: 0,
    scale: 0.86,
  }),
  visible: { y: 0, opacity: 1, scale: 1 },
  sale: (direccion: number) => ({
    y: direccion > 0 ? -12 : 12,
    opacity: 0,
    scale: 0.86,
  }),
}

function NumeroAnimado({
  valor,
  texto,
  className = '',
}: {
  valor: number
  texto: string
  className?: string
}) {
  const reducirMovimiento = useReducedMotion()
  const [anterior, setAnterior] = useState(valor)
  const [direccion, setDireccion] = useState(1)

  if (valor !== anterior) {
    setAnterior(valor)
    setDireccion(valor > anterior ? 1 : -1)
  }

  if (reducirMovimiento) return <span className={className}>{texto}</span>

  return (
    <span className={`inline-grid overflow-hidden align-bottom ${className}`}>
      <AnimatePresence initial={false} mode="popLayout" custom={direccion}>
        <motion.span
          key={texto}
          custom={direccion}
          variants={variantesNumero}
          initial="inicial"
          animate="visible"
          exit="sale"
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="col-start-1 row-start-1"
        >
          {texto}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

function ListaTemporal({
  lineas,
  totalVenta,
  onQuitar,
  onCambiarCantidad,
}: {
  lineas: LineaTemporal[]
  totalVenta: number
  onQuitar: (id: string) => void
  onCambiarCantidad: (id: string, delta: number) => void
}) {
  const [editandoId, setEditandoId] = useState<string | null>(null)

  if (lineas.length === 0) {
    return (
      <p className="rounded-3xl bg-white px-5 py-8 text-center shadow-sm">Todavía no agregas prendas.</p>
    )
  }

  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-sm">
      <h3 className="text-base">En esta venta</h3>
      <ul className="flex flex-col gap-3">
        {lineas.map((linea) => {
          const subtotalLinea = totalCanasta([linea])
          const monto = formatearDolares(linea.precio)
          const editando = editandoId === linea.id
          return (
            <li key={linea.id} className="flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block">
                  {monto} × <NumeroAnimado valor={linea.cantidad} texto={String(linea.cantidad)} />
                </span>
                <NumeroAnimado
                  valor={subtotalLinea}
                  texto={formatearDolares(subtotalLinea)}
                  className="text-sm text-black/60"
                />
              </span>
              <div className="flex shrink-0 items-center gap-2">
                {editando ? (
                  <>
                    <button
                      type="button"
                      aria-label={`Menos una de ${monto}`}
                      disabled={linea.cantidad <= 1}
                      onClick={() => onCambiarCantidad(linea.id, -1)}
                      className="inline-flex size-11 touch-manipulation items-center justify-center rounded-full bg-peligro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-40"
                    >
                      <Minus aria-hidden size={18} strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Más una de ${monto}`}
                      disabled={!Number.isSafeInteger(linea.cantidad + 1)}
                      onClick={() => onCambiarCantidad(linea.id, 1)}
                      className="inline-flex size-11 touch-manipulation items-center justify-center rounded-full bg-afirmar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-40"
                    >
                      <Plus aria-hidden size={18} strokeWidth={2} />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditandoId(linea.id)}
                    className="inline-flex min-h-11 touch-manipulation items-center rounded-full bg-black/5 px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                  >
                    Cantidad
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onQuitar(linea.id)}
                  aria-label={`Quitar ${monto}, cantidad ${linea.cantidad}`}
                  className="inline-flex min-h-11 touch-manipulation items-center rounded-full bg-borrar px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                >
                  Quitar
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      <p className="flex items-baseline justify-between gap-3">
        <span>Total de la venta</span>
        <NumeroAnimado
          valor={totalVenta}
          texto={formatearDolares(totalVenta)}
          className="font-display text-3xl leading-none tracking-wide"
        />
      </p>
    </section>
  )
}
