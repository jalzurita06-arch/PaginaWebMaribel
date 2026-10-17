import { useEffect, useId, useMemo, useRef, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowDownAZ, ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronDown, ChevronUp, Pencil } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { Aviso } from '../components/Aviso.tsx'
import { CampanaAbono } from '../components/CampanaAbono.tsx'
import { IndicadorCarga } from '../components/IndicadorCarga.tsx'
import { Layout } from '../components/Layout.tsx'
import { PanelEditarPedido, type PedidoAEditar } from '../components/PanelEditarPedido.tsx'
import { FilaTablaDesplegable, PanelDesplegable, transicionDesplegar } from '../components/PanelDesplegable.tsx'
import { secciones } from '../config/secciones.ts'
import { useConexion } from '../context/useConexion.ts'
import { abonoAtrasado, ultimasFechasAbono } from '../lib/abonoAtrasado.ts'
import {
  CLAVE_ABONOS_CANASTA,
  CLAVE_CANASTAS,
  CLAVE_ENVIOS,
  leerCache,
  pedirDatos,
  reemplazarCache,
} from '../lib/cacheLectura.ts'
import { subirAlInicio } from '../lib/dispositivo.ts'
import { coincideCliente } from '../lib/busqueda.ts'
import { MENSAJE_FALLO_RED } from '../lib/conexion.ts'
import { formatearDolares } from '../lib/dinero.ts'
import { canastaAbiertaDesdeEstado, rutaAbonoDesdeCanasta } from '../lib/navegacion.ts'
import {
  ORDENES_CANASTA,
  ordenarCanastasAbiertas,
  totalesCanastasAbiertas,
  totalesSemana,
  type GrupoDia,
  type GrupoPrecio,
  type OrdenCanasta,
} from '../lib/reglas.ts'
import {
  MENSAJE_CANASTA_VACIA,
  TIPOS_ENVIO,
  borrarEnviosAntiguos,
  listarCanastasAbiertas,
  listarEnviosSemana,
  mensajeEnvioConfirmado,
  registrarEnvio,
  type CanastaAbierta,
  type EnvioSemana,
  type TipoEnvio,
} from '../services/envios.ts'
import { listarAbonosDeClientes, type Abono } from '../services/clientes.ts'

type AvisoEstado = { texto: string; tono: 'ok' | 'error' }
type PasoSelector = 'menu' | 'tipo'
type VistaCanasta = 'abiertas' | 'historial'
type Selector = { clienteId: string; paso: PasoSelector; tipo: TipoEnvio | null }

const botonBase =
  'inline-flex touch-manipulation items-center justify-center rounded-full text-center [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50'

const boton = `${botonBase} min-h-12 w-full px-4 py-3 text-base`

const botonCompacto = `${botonBase} min-h-10 w-auto whitespace-nowrap px-4 py-2 text-sm`

const consultaPc = '(min-width: 980px)'

const etiquetasTipo: Record<TipoEnvio, string> = {
  local: 'Local',
  uber: 'Uber',
  servientrega: 'Servientrega',
}

const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const toque = { scale: 0.97 }
const Enlace = motion.create(Link)

function fechasDeAbonos(abonos: Record<string, Abono[]>): Record<string, string> {
  return ultimasFechasAbono(
    Object.entries(abonos).flatMap(([clienteId, lista]) =>
      lista.map((abono) => ({ clienteId, fecha: abono.fecha })),
    ),
  )
}

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

export function Canasta() {
  const { nombre, subtitulo, acento } = secciones.canasta
  const ubicacion = useLocation()
  const abiertaInicial = canastaAbiertaDesdeEstado(ubicacion.state)
  const { enLinea } = useConexion()
  const esPc = usePantallaPc()
  const montado = useRef(true)
  const generacion = useRef(0)
  const enviando = useRef(false)
  const reducirMovimiento = useReducedMotion()
  const [vista, setVista] = useState<VistaCanasta>('abiertas')
  const [aviso, setAviso] = useState<AvisoEstado | null>(null)
  const [cargando, setCargando] = useState(() => leerCache<CanastaAbierta[]>(CLAVE_CANASTAS) == null)
  const [canastas, setCanastas] = useState<CanastaAbierta[]>(
    () => leerCache<CanastaAbierta[]>(CLAVE_CANASTAS) ?? [],
  )
  const [ultimosAbonos, setUltimosAbonos] = useState<Record<string, string> | null>(() => {
    const guardados = leerCache<Record<string, Abono[]>>(CLAVE_ABONOS_CANASTA)
    return guardados ? fechasDeAbonos(guardados) : null
  })
  const [abonosPorCliente, setAbonosPorCliente] = useState<Record<string, Abono[]>>(
    () => leerCache<Record<string, Abono[]>>(CLAVE_ABONOS_CANASTA) ?? {},
  )
  const [errorAbonos, setErrorAbonos] = useState(false)
  const [envios, setEnvios] = useState<EnvioSemana[]>(() => leerCache<EnvioSemana[]>(CLAVE_ENVIOS) ?? [])
  const [errorCanastas, setErrorCanastas] = useState<string | null>(null)
  const [errorHistorial, setErrorHistorial] = useState<string | null>(null)
  const [recarga, setRecarga] = useState(0)
  const [abiertaId, setAbiertaId] = useState<string | null>(abiertaInicial)
  const desplazarA = useRef(abiertaInicial)
  const [selector, setSelector] = useState<Selector | null>(null)
  const [enviandoId, setEnviandoId] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState<OrdenCanasta>('codigo')
  const [pedidoEdicion, setPedidoEdicion] = useState<PedidoAEditar | null>(null)

  function abrirEdicionPedido(canasta: CanastaAbierta, dia: GrupoDia) {
    setPedidoEdicion({
      clienteId: canasta.clienteId,
      clienteCodigo: canasta.codigo,
      clienteNombre: canasta.nombre,
      fecha: dia.fecha,
      grupos: dia.grupos,
    })
  }

  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])

  useEffect(() => {
    let vigente = true
    const marca = generacion.current
    const teniaCanastas = leerCache<CanastaAbierta[]>(CLAVE_CANASTAS) != null
    const teniaEnvios = leerCache<EnvioSemana[]>(CLAVE_ENVIOS) != null
    const teniaAbonos = leerCache<Record<string, Abono[]>>(CLAVE_ABONOS_CANASTA) != null
    if (!teniaCanastas) setCargando(true)

    const borradoPromesa = borrarEnviosAntiguos()

    void (async () => {
      const [canastasResultado, enviosResultado] = await Promise.all([
        pedirDatos(CLAVE_CANASTAS, listarCanastasAbiertas, { fresco: recarga > 0 }),
        pedirDatos(CLAVE_ENVIOS, listarEnviosSemana, { fresco: recarga > 0 }),
      ])
      if (!vigente || generacion.current !== marca) return

      if (!canastasResultado.ok) {
        if (!teniaCanastas) {
          setCanastas([])
          setErrorCanastas(canastasResultado.mensaje)
        }
      } else {
        setCanastas(canastasResultado.datos)
        setErrorCanastas(null)
      }

      if (!enviosResultado.ok) {
        if (!teniaEnvios) {
          setEnvios([])
          setErrorHistorial(enviosResultado.mensaje)
        }
      } else {
        setEnvios(enviosResultado.datos)
        setErrorHistorial(null)
      }

      setCargando(false)

      const abonosResultado = canastasResultado.ok
        ? await pedirDatos(
            CLAVE_ABONOS_CANASTA,
            () => listarAbonosDeClientes(canastasResultado.datos.map((canasta) => canasta.clienteId)),
            { fresco: true },
          )
        : null
      if (!vigente || generacion.current !== marca) return

      if (canastasResultado.ok) {
        if (abonosResultado?.ok) {
          setAbonosPorCliente(abonosResultado.datos)
          setUltimosAbonos(fechasDeAbonos(abonosResultado.datos))
          setErrorAbonos(false)
        } else if (!teniaAbonos) {
          setAbonosPorCliente({})
          setUltimosAbonos(null)
          setErrorAbonos(true)
        }
      }

      const borrado = await borradoPromesa
      if (!vigente || generacion.current !== marca) return

      if (!canastasResultado.ok && !teniaCanastas) setAviso({ texto: canastasResultado.mensaje, tono: 'error' })
      else if (!enviosResultado.ok && !teniaEnvios) setAviso({ texto: enviosResultado.mensaje, tono: 'error' })
      else if (!borrado.ok) setAviso({ texto: borrado.mensaje, tono: 'error' })
      else if (abonosResultado && !abonosResultado.ok && !teniaAbonos) {
        setAviso({ texto: abonosResultado.mensaje, tono: 'error' })
      } else setAviso((actual) => (actual?.tono === 'error' ? null : actual))
    })()

    return () => {
      vigente = false
    }
  }, [recarga])

  useEffect(() => {
    if (cargando || !desplazarA.current) return
    const id = desplazarA.current
    desplazarA.current = null
    document.getElementById(`canasta-${id}`)?.scrollIntoView({ block: 'center' })
  }, [cargando])

  function mostrar(texto: string, tono: AvisoEstado['tono']) {
    setAviso({ texto, tono })
    subirAlInicio()
  }

  async function confirmarEnvio(canasta: CanastaAbierta, tipo: TipoEnvio) {
    if (enviando.current) return
    if (!enLinea) {
      mostrar(MENSAJE_FALLO_RED, 'error')
      return
    }
    enviando.current = true
    setEnviandoId(canasta.clienteId)
    setAviso(null)
    const resultado = await registrarEnvio(canasta.clienteId, tipo)
    if (!montado.current) return
    enviando.current = false
    setEnviandoId(null)

    if (!resultado.ok) {
      mostrar(resultado.mensaje, 'error')
      if (resultado.mensaje === MENSAJE_CANASTA_VACIA) {
        setCanastas((actual) => actual.filter((fila) => fila.clienteId !== canasta.clienteId))
        setSelector(null)
      }
      return
    }

    let siguientesCanastas: CanastaAbierta[] | null = null
    setCanastas((actual) => {
      siguientesCanastas = actual.filter((fila) => fila.clienteId !== canasta.clienteId)
      return siguientesCanastas
    })
    let siguientesEnvios: EnvioSemana[] | null = null
    setEnvios((actual) => {
      siguientesEnvios = [
        resultado.datos.envio,
        ...actual.filter((envio) => envio.id !== resultado.datos.envio.id),
      ]
      return siguientesEnvios
    })
    generacion.current += 1
    if (siguientesCanastas) reemplazarCache(CLAVE_CANASTAS, siguientesCanastas)
    if (siguientesEnvios) reemplazarCache(CLAVE_ENVIOS, siguientesEnvios)
    setSelector(null)
    setAbiertaId((actual) => (actual === canasta.clienteId ? null : actual))
    setErrorHistorial(null)
    mostrar(mensajeEnvioConfirmado(resultado.datos.nuevoSaldoFavor), 'ok')

    const [canastasNuevas, enviosNuevos] = await Promise.all([
      listarCanastasAbiertas(),
      listarEnviosSemana(),
    ])
    if (!montado.current) return
    if (canastasNuevas.ok) {
      reemplazarCache(CLAVE_CANASTAS, canastasNuevas.datos)
      setCanastas(canastasNuevas.datos)
    }
    if (enviosNuevos.ok) {
      reemplazarCache(CLAVE_ENVIOS, enviosNuevos.datos)
      setEnvios(enviosNuevos.datos)
    }
  }

  const ocupado = enviandoId !== null
  const resumenAbiertas = totalesCanastasAbiertas(canastas)
  const canastasVisibles = useMemo(
    () =>
      ordenarCanastasAbiertas(
        canastas.filter((canasta) => coincideCliente(busqueda, canasta.codigo, canasta.nombre)),
        orden,
      ),
    [busqueda, canastas, orden],
  )
  const enviosVisibles = envios.filter((envio) => coincideCliente(busqueda, envio.codigo, null))

  function sinAbono(clienteId: string) {
    if (!ultimosAbonos) return false
    return abonoAtrasado(ultimosAbonos[clienteId], new Date())
  }

  function irA(destino: VistaCanasta) {
    setVista(destino)
    subirAlInicio()
  }

  return (
    <Layout titulo={nombre} subtitulo={subtitulo} acento={acento}>
      {aviso ? <Aviso tono={aviso.tono}>{aviso.texto}</Aviso> : null}

      {vista === 'abiertas' ? (
        <>
          {cargando ? <IndicadorCarga>Cargando canastas…</IndicadorCarga> : null}

          {!cargando && errorCanastas ? (
            <div className="flex flex-col gap-3">
              <button type="button" onClick={() => setRecarga((valor) => valor + 1)} className={`${boton} bg-black text-white`}>
                Reintentar
              </button>
              <motion.button
                type="button"
                onClick={() => irA('historial')}
                whileTap={reducirMovimiento ? undefined : toque}
                transition={{ duration: 0.15 }}
                className={`${boton} bg-black/5`}
              >
                Historial de la semana
              </motion.button>
            </div>
          ) : null}

          {!cargando && !errorCanastas ? (
            <ResumenAbiertas
              acento={acento}
              total={resumenAbiertas.total}
              saldo={resumenAbiertas.saldo}
              prendas={resumenAbiertas.prendas}
              reducirMovimiento={reducirMovimiento}
              onHistorial={() => irA('historial')}
            />
          ) : null}

          {!cargando && !errorCanastas && canastas.length > 0 ? (
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <BuscadorClientes valor={busqueda} onCambiar={setBusqueda} />
              </div>
              <FiltroOrden acento={acento} orden={orden} onElegir={setOrden} />
            </div>
          ) : null}

          {!cargando && !errorCanastas && canastas.length === 0 ? (
            <p className={esPc ? 'text-base' : 'rounded-3xl bg-white px-5 py-8 text-center shadow-sm'}>
              No hay canastas abiertas.
            </p>
          ) : null}

          {!cargando && !errorCanastas && canastas.length > 0 && canastasVisibles.length === 0 ? (
            <p className={esPc ? 'text-base' : 'rounded-3xl bg-white px-5 py-8 text-center shadow-sm'}>
              Ninguna canasta coincide con la búsqueda.
            </p>
          ) : null}

          {canastasVisibles.length > 0 && esPc ? (
            <TablaCanastas
              canastas={canastasVisibles}
              acento={acento}
              sinAbono={sinAbono}
              abonosDe={(id) => (errorAbonos ? null : (abonosPorCliente[id] ?? []))}
              abiertaId={abiertaId}
              selector={selector}
              ocupado={ocupado}
              enviandoId={enviandoId}
              onAlternar={(id) => setAbiertaId((actual) => (actual === id ? null : id))}
              onAbrirSelector={(id) => setSelector({ clienteId: id, paso: 'menu', tipo: null })}
              onCerrarSelector={() => setSelector(null)}
              onEnviado={(id) => setSelector({ clienteId: id, paso: 'tipo', tipo: null })}
              onElegirTipo={(id, tipo) =>
                setSelector((actual) => (actual?.clienteId === id ? { ...actual, tipo } : actual))
              }
              onConfirmar={(canasta, tipo) => void confirmarEnvio(canasta, tipo)}
              onEditarPedido={abrirEdicionPedido}
            />
          ) : null}

          {canastasVisibles.length > 0 && !esPc ? (
            <ul className="flex flex-col gap-3">
              {canastasVisibles.map((canasta) => (
                <FilaCanasta
                  key={canasta.clienteId}
                  canasta={canasta}
                  acento={acento}
                  sinAbono={sinAbono(canasta.clienteId)}
                  abonos={errorAbonos ? null : (abonosPorCliente[canasta.clienteId] ?? [])}
                  abierta={abiertaId === canasta.clienteId}
                  selector={selector?.clienteId === canasta.clienteId ? selector : null}
                  ocupado={ocupado}
                  enviando={enviandoId === canasta.clienteId}
                  onAlternar={() =>
                    setAbiertaId((actual) => (actual === canasta.clienteId ? null : canasta.clienteId))
                  }
                  onAbrirSelector={() =>
                    setSelector({ clienteId: canasta.clienteId, paso: 'menu', tipo: null })
                  }
                  onCerrarSelector={() => setSelector(null)}
                  onEnviado={() =>
                    setSelector({ clienteId: canasta.clienteId, paso: 'tipo', tipo: null })
                  }
                  onElegirTipo={(tipo) =>
                    setSelector((actual) =>
                      actual?.clienteId === canasta.clienteId ? { ...actual, tipo } : actual,
                    )
                  }
                  onConfirmar={(tipo) => void confirmarEnvio(canasta, tipo)}
                  onEditarPedido={(dia) => abrirEdicionPedido(canasta, dia)}
                />
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <HistorialSemana
          acento={acento}
          envios={enviosVisibles}
          todos={envios}
          error={errorHistorial}
          cargando={cargando}
          esPc={esPc}
          busqueda={busqueda}
          reducirMovimiento={reducirMovimiento}
          onBusqueda={setBusqueda}
          onCanastas={() => irA('abiertas')}
          onReintentar={() => setRecarga((valor) => valor + 1)}
        />
      )}

      <PanelEditarPedido
        pedido={pedidoEdicion}
        abierto={pedidoEdicion != null}
        onCerrar={() => setPedidoEdicion(null)}
        onGuardado={() => {
          setPedidoEdicion(null)
          setAviso({ texto: 'Pedido actualizado correctamente.', tono: 'ok' })
          setRecarga((valor) => valor + 1)
        }}
      />
    </Layout>
  )
}

function ResumenAbiertas({
  acento,
  total,
  saldo,
  prendas,
  reducirMovimiento,
  onHistorial,
}: {
  acento: string
  total: number
  saldo: number
  prendas: number
  reducirMovimiento: boolean | null
  onHistorial: () => void
}) {
  return (
    <section className="flex flex-col gap-5 rounded-3xl p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between lg:gap-8 lg:p-8" style={{ backgroundColor: acento }}>
      <dl className="grid grid-cols-3 gap-3 lg:min-w-0 lg:flex-1 lg:gap-10">
        <div>
          <dt className="text-sm">Total</dt>
          <dd className="font-display text-2xl leading-none tracking-wide sm:text-3xl">{formatearDolares(total)}</dd>
        </div>
        <div>
          <dt className="text-sm">Saldo</dt>
          <dd className="font-display text-2xl leading-none tracking-wide sm:text-3xl">{formatearDolares(saldo)}</dd>
        </div>
        <div>
          <dt className="text-sm">Prendas</dt>
          <dd className="font-display text-2xl leading-none tracking-wide sm:text-3xl">{prendas}</dd>
        </div>
      </dl>
      <motion.button
        type="button"
        onClick={onHistorial}
        whileTap={reducirMovimiento ? undefined : toque}
        transition={{ duration: 0.15 }}
        className={`${boton} bg-black text-white lg:w-auto lg:shrink-0 lg:px-6`}
      >
        Historial de la semana
      </motion.button>
    </section>
  )
}

function NombreCliente({ nombre, className }: { nombre: string | null; className: string }) {
  if (!nombre) return null
  return <span className={`min-w-0 break-words ${className}`}>{nombre}</span>
}

function FilaCanasta({
  canasta,
  acento,
  sinAbono,
  abonos,
  abierta,
  selector,
  ocupado,
  enviando,
  onAlternar,
  onAbrirSelector,
  onCerrarSelector,
  onEnviado,
  onElegirTipo,
  onConfirmar,
  onEditarPedido,
}: {
  canasta: CanastaAbierta
  acento: string
  sinAbono: boolean
  abonos: Abono[] | null
  abierta: boolean
  selector: Selector | null
  ocupado: boolean
  enviando: boolean
  onAlternar: () => void
  onAbrirSelector: () => void
  onCerrarSelector: () => void
  onEnviado: () => void
  onElegirTipo: (tipo: TipoEnvio) => void
  onConfirmar: (tipo: TipoEnvio) => void
  onEditarPedido?: (dia: GrupoDia) => void
}) {
  const detalleId = useId()

  return (
    <li
      id={`canasta-${canasta.clienteId}`}
      className={`flex scroll-mt-4 flex-col rounded-3xl p-5 shadow-sm ${sinAbono ? 'bg-peligro' : 'bg-white'}`}
    >
      <button
        type="button"
        aria-expanded={abierta}
        aria-controls={detalleId}
        onClick={onAlternar}
        className="touch-manipulation text-left [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
      >
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="min-w-0 break-words font-display text-2xl uppercase leading-none tracking-wide lg:text-4xl">
                {canasta.codigo}
              </span>
              {sinAbono ? <CampanaAbono /> : null}
            </span>
            <NombreCliente nombre={canasta.nombre} className="mt-2 block text-sm" />
          </span>
          <span className="shrink-0 pt-0.5 text-xl font-bold leading-none">{textoCantidad(canasta.prendas)}</span>
        </span>
        <span className="mt-4 grid grid-cols-3 gap-2">
          <Monto etiqueta="Total" valor={canasta.total} />
          <Monto etiqueta="Abonado" valor={canasta.saldoFavor} />
          <Monto etiqueta="Saldo" valor={canasta.saldo} />
        </span>
      </button>

      <PanelDesplegable abierto={abierta}>
        <div className="pt-4">
          <DetalleCanasta
            id={detalleId}
            grupos={canasta.grupos}
            dias={canasta.dias}
            abonos={abonos}
            onEditarPedido={onEditarPedido}
          />
        </div>
      </PanelDesplegable>

      <div className="pt-4">
        <AccionesCanasta
          canasta={canasta}
          acento={acento}
          selector={selector}
          ocupado={ocupado}
          enviando={enviando}
          onAbrirSelector={onAbrirSelector}
          onCerrarSelector={onCerrarSelector}
          onEnviado={onEnviado}
          onElegirTipo={onElegirTipo}
          onConfirmar={onConfirmar}
        />
      </div>
    </li>
  )
}

function TablaCanastas({
  canastas,
  acento,
  sinAbono,
  abonosDe,
  abiertaId,
  selector,
  ocupado,
  enviandoId,
  onAlternar,
  onAbrirSelector,
  onCerrarSelector,
  onEnviado,
  onElegirTipo,
  onConfirmar,
  onEditarPedido,
}: {
  canastas: CanastaAbierta[]
  acento: string
  sinAbono: (clienteId: string) => boolean
  abonosDe: (clienteId: string) => Abono[] | null
  abiertaId: string | null
  selector: Selector | null
  ocupado: boolean
  enviandoId: string | null
  onAlternar: (id: string) => void
  onAbrirSelector: (id: string) => void
  onCerrarSelector: () => void
  onEnviado: (id: string) => void
  onElegirTipo: (id: string, tipo: TipoEnvio) => void
  onConfirmar: (canasta: CanastaAbierta, tipo: TipoEnvio) => void
  onEditarPedido?: (canasta: CanastaAbierta, dia: GrupoDia) => void
}) {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-left lg:[&_td]:px-4 lg:[&_td]:py-2.5 lg:[&_th]:px-4 lg:[&_th]:py-3">
          <caption className="sr-only">Canastas abiertas</caption>
          <colgroup>
            <col className="w-[1%]" />
            <col className="w-[5.5rem]" />
            <col className="w-[7.5rem]" />
            <col className="w-[7.5rem]" />
            <col className="w-[7.5rem]" />
            <col />
          </colgroup>
          <thead>
            <tr className="text-sm" style={{ backgroundColor: acento }}>
              <th scope="col" className="px-4 py-3 pr-2 font-semibold">
                Código
              </th>
              <th scope="col" className="px-4 py-3 pl-2 text-right font-semibold">
                Prendas
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Total
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Abono
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Saldo
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {canastas.map((canasta) => {
              const abierta = abiertaId === canasta.clienteId
              return (
                <FilasTabla
                  key={canasta.clienteId}
                  canasta={canasta}
                  acento={acento}
                  sinAbono={sinAbono(canasta.clienteId)}
                  abonos={abonosDe(canasta.clienteId)}
                  abierta={abierta}
                  selector={selector?.clienteId === canasta.clienteId ? selector : null}
                  ocupado={ocupado}
                  enviando={enviandoId === canasta.clienteId}
                  onAlternar={() => onAlternar(canasta.clienteId)}
                  onAbrirSelector={() => onAbrirSelector(canasta.clienteId)}
                  onCerrarSelector={onCerrarSelector}
                  onEnviado={() => onEnviado(canasta.clienteId)}
                  onElegirTipo={(tipo) => onElegirTipo(canasta.clienteId, tipo)}
                  onConfirmar={(tipo) => onConfirmar(canasta, tipo)}
                  onEditarPedido={(dia) => onEditarPedido?.(canasta, dia)}
                />
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FilasTabla({
  canasta,
  acento,
  sinAbono,
  abonos,
  abierta,
  selector,
  ocupado,
  enviando,
  onAlternar,
  onAbrirSelector,
  onCerrarSelector,
  onEnviado,
  onElegirTipo,
  onConfirmar,
  onEditarPedido,
}: {
  canasta: CanastaAbierta
  acento: string
  sinAbono: boolean
  abonos: Abono[] | null
  abierta: boolean
  selector: Selector | null
  ocupado: boolean
  enviando: boolean
  onAlternar: () => void
  onAbrirSelector: () => void
  onCerrarSelector: () => void
  onEnviado: () => void
  onElegirTipo: (tipo: TipoEnvio) => void
  onConfirmar: (tipo: TipoEnvio) => void
  onEditarPedido?: (dia: GrupoDia) => void
}) {
  const detalleId = useId()

  function alternarSiEsDato(evento: MouseEvent<HTMLTableRowElement>) {
    const destino = evento.target
    if (!(destino instanceof Element)) return
    if (destino.closest('a, button')) return
    onAlternar()
  }

  return (
    <>
      <tr
        id={`canasta-${canasta.clienteId}`}
        className={`scroll-mt-4 border-b border-black/10 align-middle ${sinAbono ? 'bg-peligro' : abierta ? 'bg-black/[0.03]' : 'hover:bg-black/[0.03]'}`}
        onClick={alternarSiEsDato}
      >
        <td className="whitespace-nowrap px-4 py-2.5 pr-2">
          <span className="inline-flex items-center gap-1.5">
            <button
              type="button"
              aria-expanded={abierta}
              aria-controls={detalleId}
              onClick={onAlternar}
              className="text-left font-display text-2xl uppercase leading-none tracking-wide focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              {canasta.codigo}
            </button>
            {sinAbono ? <CampanaAbono /> : null}
          </span>
          <NombreCliente nombre={canasta.nombre} className="mt-1 block text-sm" />
        </td>
        <td className="px-4 py-2.5 pl-2 text-right text-xl font-bold tabular-nums leading-none">
          {canasta.prendas}
        </td>
        <td className="px-4 py-2.5 text-right tabular-nums">{formatearDolares(canasta.total)}</td>
        <td className="px-4 py-2.5 text-right tabular-nums">{formatearDolares(canasta.saldoFavor)}</td>
        <td className="px-4 py-2.5 text-right tabular-nums">{formatearDolares(canasta.saldo)}</td>
        <td className="px-4 py-2.5">
          <AccionesCanasta
            canasta={canasta}
            acento={acento}
            selector={selector}
            ocupado={ocupado}
            enviando={enviando}
            compacto
            onAbrirSelector={onAbrirSelector}
            onCerrarSelector={onCerrarSelector}
            onEnviado={onEnviado}
            onElegirTipo={onElegirTipo}
            onConfirmar={onConfirmar}
          />
        </td>
      </tr>
      <FilaTablaDesplegable abierto={abierta} colSpan={6}>
        <div className="px-6 py-4">
          <DetalleCanasta
            id={detalleId}
            grupos={canasta.grupos}
            dias={canasta.dias}
            abonos={abonos}
            holgado
            onEditarPedido={onEditarPedido}
          />
        </div>
      </FilaTablaDesplegable>
    </>
  )
}

function DetalleCanasta({
  id,
  grupos,
  dias,
  abonos,
  holgado = false,
  onEditarPedido,
}: {
  id: string
  grupos: GrupoPrecio[]
  dias: GrupoDia[]
  abonos: Abono[] | null
  holgado?: boolean
  onEditarPedido?: (dia: GrupoDia) => void
}) {
  return (
    <div
      id={id}
      className={
        holgado
          ? 'grid max-w-3xl grid-cols-[minmax(0,1fr)_15rem] items-start gap-x-10'
          : 'grid grid-cols-[minmax(0,1fr)_auto] items-start'
      }
    >
      <div className={holgado ? 'min-w-0 pr-6' : 'min-w-0 pr-3'}>
        <ListaPrendas grupos={grupos} dias={dias} apretado={!holgado} onEditarPedido={onEditarPedido} />
      </div>
      <div
        className={
          holgado
            ? 'min-w-0 border-l border-black/15 pl-6'
            : 'min-w-[7.25rem] border-l border-black/10 pl-3'
        }
      >
        <ListaAbonos abonos={abonos} holgado={holgado} />
      </div>
    </div>
  )
}

function ListaAbonos({ abonos, holgado = false }: { abonos: Abono[] | null; holgado?: boolean }) {
  const tituloId = useId()

  return (
    <section className="flex min-w-0 flex-col gap-2" aria-labelledby={tituloId}>
      <h3 id={tituloId} className="text-base font-semibold">
        Abonos
      </h3>
      {abonos == null ? (
        <p className="text-sm text-black/60">No se pudieron cargar los abonos.</p>
      ) : abonos.length === 0 ? (
        <p className="text-sm text-black/60">Aún no hay abonos.</p>
      ) : (
        <ul
          className={`flex flex-col overflow-y-auto ${holgado ? 'max-h-72 gap-1.5' : 'max-h-52 gap-2'}`}
        >
          {abonos.map((abono) => (
            <li
              key={abono.id}
              className="flex items-baseline justify-between gap-3 text-base tabular-nums"
            >
              <span className="min-w-0 truncate text-black/70">{textoFecha(abono.fecha)}</span>
              <span className="shrink-0">{formatearDolares(abono.monto)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ListaPrendas({
  id,
  grupos,
  dias = [],
  apretado = false,
  onEditarPedido,
}: {
  id?: string
  grupos: GrupoPrecio[]
  dias?: GrupoDia[]
  apretado?: boolean
  onEditarPedido?: (dia: GrupoDia) => void
}) {
  const internoId = useId()
  const tituloId = `${id ?? internoId}-titulo`
  const porDia = dias.filter((dia) => dia.prendas > 0)
  const usarDias = porDia.some((dia) => dia.fecha)
  const linea = apretado
    ? 'flex items-baseline justify-between gap-2 text-base tabular-nums'
    : 'flex items-baseline justify-between gap-3 text-base tabular-nums'
  const titulo = 'text-base font-semibold'

  return (
    <section id={id} className="flex min-w-0 flex-col gap-2" aria-labelledby={tituloId}>
      <h3 id={tituloId} className={titulo}>
        Prendas
      </h3>
      {usarDias ? (
        <ul className={`flex flex-col ${apretado ? 'gap-3' : 'gap-3.5'}`}>
          {porDia.map((dia) => (
            <li key={dia.fecha || 'sin-fecha'} className={`flex flex-col ${apretado ? 'gap-1.5' : 'gap-1'}`}>
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm text-black/60">
                  {dia.fecha ? textoFecha(dia.fecha) : 'Sin fecha'}
                  {apretado ? ` · ${dia.prendas}` : ` · ${textoCantidad(dia.prendas)}`}
                </h4>
                {onEditarPedido && dia.fecha ? (
                  <button
                    type="button"
                    aria-label={`Editar pedido del ${textoFecha(dia.fecha)}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditarPedido(dia)
                    }}
                    className="inline-flex size-6 shrink-0 touch-manipulation items-center justify-center rounded-full bg-black/5 text-black hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                    title="Editar prendas de este pedido"
                  >
                    <Pencil size={12} aria-hidden />
                  </button>
                ) : null}
              </div>
              <ul className={`flex flex-col ${apretado ? 'gap-1.5' : 'gap-1'}`}>
                {dia.grupos.map((grupo) => (
                  <li key={grupo.precio} className={linea}>
                    <span className="min-w-0">
                      {formatearDolares(grupo.precio)}
                      {apretado ? '×' : ' × '}
                      {grupo.cantidad}
                    </span>
                    <span className="shrink-0">{formatearDolares(grupo.subtotal)}</span>
                  </li>
                ))}
              </ul>
              {!apretado && porDia.length > 1 ? (
                <p className="mt-0.5 flex justify-end text-base tabular-nums">
                  <span className="flex shrink-0 items-baseline gap-1.5 font-semibold">
                    <span>Total</span>
                    <span>{formatearDolares(dia.total)}</span>
                  </span>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <ul className={`flex flex-col ${apretado ? 'gap-1.5' : 'gap-1'}`}>
          {grupos.map((grupo) => (
            <li key={grupo.precio} className={linea}>
              <span className="min-w-0">
                {formatearDolares(grupo.precio)}
                {apretado ? '×' : ' × '}
                {grupo.cantidad}
              </span>
              <span className="shrink-0">{formatearDolares(grupo.subtotal)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function AccionesCanasta({
  canasta,
  acento,
  selector,
  ocupado,
  enviando,
  compacto = false,
  onAbrirSelector,
  onCerrarSelector,
  onEnviado,
  onElegirTipo,
  onConfirmar,
}: {
  canasta: CanastaAbierta
  acento: string
  selector: Selector | null
  ocupado: boolean
  enviando: boolean
  compacto?: boolean
  onAbrirSelector: () => void
  onCerrarSelector: () => void
  onEnviado: () => void
  onElegirTipo: (tipo: TipoEnvio) => void
  onConfirmar: (tipo: TipoEnvio) => void
}) {
  const reducirMovimiento = useReducedMotion()
  const bloqueado = ocupado && !enviando
  const clase = compacto ? botonCompacto : boton
  const bloqueada = ocupado || enviando

  return (
    <div className={compacto ? 'flex flex-nowrap items-center justify-end gap-2' : 'flex flex-col gap-4'}>
      <div className={compacto ? 'flex flex-nowrap items-center gap-2' : 'grid grid-cols-2 gap-3'}>
        <Enlace
          to={`/compartir/${canasta.clienteId}`}
          state={{ desde: 'canasta' }}
          aria-disabled={bloqueada || undefined}
          tabIndex={bloqueada ? -1 : undefined}
          onClick={(evento) => {
            if (bloqueada) evento.preventDefault()
          }}
          whileTap={reducirMovimiento || bloqueada ? undefined : toque}
          transition={{ duration: 0.15 }}
          className={`${clase} bg-black text-white ${bloqueada ? 'pointer-events-none opacity-50' : ''}`}
        >
          Enviar total
        </Enlace>
        <Enlace
          to={rutaAbonoDesdeCanasta(canasta.clienteId)}
          aria-disabled={bloqueada || undefined}
          tabIndex={bloqueada ? -1 : undefined}
          onClick={(evento) => {
            if (bloqueada) evento.preventDefault()
          }}
          whileTap={reducirMovimiento || bloqueada ? undefined : toque}
          transition={{ duration: 0.15 }}
          className={`${clase} ${bloqueada ? 'pointer-events-none opacity-50' : ''}`}
          style={{ backgroundColor: acento }}
        >
          Abono
        </Enlace>
      </div>
      <SelectorEnvio
        codigo={canasta.codigo}
        acento={acento}
        compacto={compacto}
        abierto={selector !== null}
        paso={selector?.paso ?? 'menu'}
        tipo={selector?.tipo ?? null}
        ocupado={bloqueado}
        enviando={enviando}
        onAbrir={onAbrirSelector}
        onBodega={onCerrarSelector}
        onEnviado={onEnviado}
        onElegirTipo={onElegirTipo}
        onConfirmar={onConfirmar}
        onCancelar={onCerrarSelector}
      />
    </div>
  )
}

function BuscadorClientes({
  valor,
  onCambiar,
}: {
  valor: string
  onCambiar: (valor: string) => void
}) {
  const idBusqueda = useId()

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm" htmlFor={idBusqueda}>
        Buscar
      </label>
      <input
        id={idBusqueda}
        type="search"
        enterKeyHint="search"
        value={valor}
        placeholder="Código o nombre"
        onChange={(evento) => onCambiar(evento.target.value)}
        className="rounded-full bg-white px-5 py-4 text-base shadow-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
      />
    </div>
  )
}

const opcionesOrden: Record<OrdenCanasta, { texto: string; detalle: string; icono: typeof ArrowDownAZ }> = {
  codigo: { texto: 'A–Z', detalle: 'Por código', icono: ArrowDownAZ },
  saldoMayor: { texto: 'Debe más', detalle: 'Saldo de mayor a menor', icono: ArrowDownWideNarrow },
  saldoMenor: { texto: 'Debe menos', detalle: 'Saldo de menor a mayor', icono: ArrowUpNarrowWide },
}

function FiltroOrden({
  acento,
  orden,
  onElegir,
}: {
  acento: string
  orden: OrdenCanasta
  onElegir: (orden: OrdenCanasta) => void
}) {
  const reducirMovimiento = useReducedMotion()
  const listaId = useId()
  const refBoton = useRef<HTMLButtonElement>(null)
  const refLista = useRef<HTMLDivElement>(null)
  const [abierto, setAbierto] = useState(false)
  const salto = reducirMovimiento === true
  const transicion = salto ? { duration: 0 } : transicionDesplegar
  const actual = opcionesOrden[orden]
  const IconoActual = actual.icono

  useEffect(() => {
    if (!abierto) return
    function cerrarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setAbierto(false)
    }
    window.addEventListener('keydown', cerrarTecla)
    return () => window.removeEventListener('keydown', cerrarTecla)
  }, [abierto])

  useEffect(() => {
    if (!abierto) return
    refLista.current?.querySelector('button')?.focus()
  }, [abierto])

  useEffect(() => {
    if (!abierto) return
    const boton = refBoton.current
    return () => boton?.focus()
  }, [abierto])

  const lista = createPortal(
    <AnimatePresence>
      {abierto ? (
        <motion.div
          key="orden"
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby={listaId}
          initial={salto ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transicion}
        >
          <button
            type="button"
            aria-label="Cerrar orden"
            onClick={() => setAbierto(false)}
            className="absolute inset-0 bg-black/25"
          />
          <motion.div
            ref={refLista}
            role="listbox"
            aria-labelledby={listaId}
            initial={salto ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 28 }}
            transition={transicion}
            className="absolute inset-x-0 bottom-0 mx-auto flex w-full max-w-md flex-col gap-2 rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-md"
          >
            <p id={listaId} className="px-2 pb-1 text-sm text-black/60">
              Ordenar
            </p>
            {ORDENES_CANASTA.map((opcion) => {
              const dato = opcionesOrden[opcion]
              const Icono = dato.icono
              const elegido = opcion === orden
              return (
                <button
                  key={opcion}
                  type="button"
                  role="option"
                  aria-selected={elegido}
                  onClick={() => {
                    onElegir(opcion)
                    setAbierto(false)
                  }}
                  className="inline-flex min-h-14 w-full touch-manipulation items-center justify-start gap-3 rounded-full px-4 py-3 text-left [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                  style={{ backgroundColor: elegido ? acento : '#F5F0E8' }}
                >
                  <Icono className="size-5 shrink-0" aria-hidden />
                  <span className="min-w-0">
                    <span className="block leading-none">{dato.texto}</span>
                    <span className="mt-1 block text-sm text-black/60">{dato.detalle}</span>
                  </span>
                </button>
              )
            })}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )

  return (
    <>
      <motion.button
        ref={refBoton}
        type="button"
        aria-expanded={abierto}
        aria-haspopup="dialog"
        aria-label={`Orden ${actual.texto}. Abrir lista`}
        onClick={() => setAbierto((valor) => !valor)}
        whileTap={reducirMovimiento ? undefined : toque}
        transition={{ duration: 0.15 }}
        className="inline-flex h-14 shrink-0 touch-manipulation items-center gap-1.5 rounded-full bg-white px-3.5 text-sm shadow-sm [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
      >
        <IconoActual className="size-4 shrink-0" aria-hidden />
        <span className="whitespace-nowrap">{actual.texto}</span>
        {abierto ? <ChevronUp aria-hidden size={16} /> : <ChevronDown aria-hidden size={16} />}
      </motion.button>
      {lista}
    </>
  )
}

function Monto({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <span>
      <span className="block text-sm text-black/60">{etiqueta}</span>
      <span className="block text-base">{formatearDolares(valor)}</span>
    </span>
  )
}

function SelectorEnvio({
  codigo,
  acento,
  compacto = false,
  abierto,
  paso,
  tipo,
  ocupado,
  enviando,
  onAbrir,
  onBodega,
  onEnviado,
  onElegirTipo,
  onConfirmar,
  onCancelar,
}: {
  codigo: string
  acento: string
  compacto?: boolean
  abierto: boolean
  paso: PasoSelector
  tipo: TipoEnvio | null
  ocupado: boolean
  enviando: boolean
  onAbrir: () => void
  onBodega: () => void
  onEnviado: () => void
  onElegirTipo: (tipo: TipoEnvio) => void
  onConfirmar: (tipo: TipoEnvio) => void
  onCancelar: () => void
}) {
  const { enLinea } = useConexion()
  const esPc = usePantallaPc()
  const reducirMovimiento = useReducedMotion()
  const panelId = useId()
  const tituloId = useId()
  const refBoton = useRef<HTMLButtonElement>(null)
  const refPanel = useRef<HTMLDivElement>(null)
  const [caja, setCaja] = useState<{
    top?: number
    bottom?: number
    right: number
    width: number
    maxHeight: number
  } | null>(null)
  const etiqueta = abierto && paso === 'tipo' ? 'Enviado' : 'Bodega'
  const colorEstado = etiqueta === 'Enviado' ? 'bg-afirmar' : 'bg-fondo'
  const salto = reducirMovimiento === true
  const transicion = salto ? { duration: 0 } : transicionDesplegar
  const etiquetaPanel = paso === 'tipo' ? `Tipo de envío de ${codigo}` : `Estado de ${codigo}`

  useEffect(() => {
    if (!abierto || !esPc) {
      setCaja(null)
      return
    }

    function ubicar() {
      const boton = refBoton.current?.getBoundingClientRect()
      if (!boton) return
      const margen = 8
      const ancho = Math.max(boton.width, 176)
      const altoEstimado = paso === 'tipo' ? 360 : 160
      const espacioAbajo = window.innerHeight - boton.bottom - margen
      const espacioArriba = boton.top - margen
      const abrirArriba = espacioAbajo < Math.min(altoEstimado, 280) && espacioArriba > espacioAbajo
      const maxHeight = Math.max(120, (abrirArriba ? espacioArriba : espacioAbajo) - 8)

      setCaja(
        abrirArriba
          ? {
              bottom: window.innerHeight - boton.top + margen,
              right: window.innerWidth - boton.right,
              width: ancho,
              maxHeight,
            }
          : {
              top: boton.bottom + margen,
              right: window.innerWidth - boton.right,
              width: ancho,
              maxHeight,
            },
      )
    }

    ubicar()
    window.addEventListener('resize', ubicar)
    window.addEventListener('scroll', ubicar, true)
    return () => {
      window.removeEventListener('resize', ubicar)
      window.removeEventListener('scroll', ubicar, true)
    }
  }, [abierto, paso, esPc])

  useEffect(() => {
    if (!abierto) return
    if (esPc && !caja) return
    refPanel.current?.querySelector('button')?.focus()
  }, [abierto, paso, caja, esPc])

  useEffect(() => {
    if (!abierto) return
    function cerrarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && !enviando) onCancelar()
    }
    window.addEventListener('keydown', cerrarTecla)
    return () => window.removeEventListener('keydown', cerrarTecla)
  }, [abierto, enviando, onCancelar])

  useEffect(() => {
    if (!abierto || !esPc) return
    function cerrarClic(evento: Event) {
      const destino = evento.target
      if (!(destino instanceof Node)) return
      if (refBoton.current?.contains(destino) || refPanel.current?.contains(destino)) return
      if (!enviando) onCancelar()
    }
    document.addEventListener('mousedown', cerrarClic)
    return () => document.removeEventListener('mousedown', cerrarClic)
  }, [abierto, esPc, enviando, onCancelar])

  useEffect(() => {
    if (!abierto) return
    const boton = refBoton.current
    return () => boton?.focus()
  }, [abierto])

  const opciones =
    paso === 'menu' ? (
      <>
        <button type="button" aria-pressed onClick={onBodega} className={`${boton} bg-fondo`}>
          Bodega
        </button>
        <button type="button" onClick={onEnviado} className={`${boton} bg-afirmar`}>
          Enviado
        </button>
      </>
    ) : (
      <>
        {TIPOS_ENVIO.map((opcion) => (
          <button
            key={opcion}
            type="button"
            aria-pressed={tipo === opcion}
            disabled={enviando}
            onClick={() => onElegirTipo(opcion)}
            className={boton}
            style={{ backgroundColor: tipo === opcion ? acento : '#F5F0E8', color: '#000' }}
          >
            {etiquetasTipo[opcion]}
          </button>
        ))}
        <button
          type="button"
          disabled={enviando || tipo == null || !enLinea}
          onClick={() => {
            if (tipo) onConfirmar(tipo)
          }}
          className={`inline-flex min-h-12 w-full touch-manipulation items-center justify-center rounded-full bg-black px-4 py-3 text-center text-base text-white [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50 ${enviando ? 'opacity-50' : ''}`}
        >
          {enviando ? 'Enviando…' : 'Confirmar'}
        </button>
        <button type="button" disabled={enviando} onClick={onCancelar} className={`${boton} bg-fondo`}>
          Cancelar
        </button>
      </>
    )

  const panel = createPortal(
    <AnimatePresence>
      {abierto && (!esPc || caja) ? (
        esPc && caja ? (
          <motion.div
            key="envio-pc"
            ref={refPanel}
            id={panelId}
            role="group"
            aria-label={etiquetaPanel}
            initial={salto ? false : { opacity: 0, y: caja.bottom != null ? 8 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={salto ? undefined : { opacity: 0, y: caja.bottom != null ? 8 : -8 }}
            transition={transicion}
            className="fixed z-50 flex max-h-[min(70dvh,24rem)] flex-col gap-2 overflow-y-auto rounded-3xl bg-white p-3 shadow-md"
            style={{
              top: caja.top,
              bottom: caja.bottom,
              right: caja.right,
              width: caja.width,
              maxHeight: caja.maxHeight,
            }}
          >
            {opciones}
          </motion.div>
        ) : (
          <motion.div
            key="envio-movil"
            className="fixed inset-0 z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby={tituloId}
            initial={salto ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={salto ? undefined : { opacity: 0 }}
            transition={transicion}
          >
            <button
              type="button"
              aria-label="Cerrar envío"
              disabled={enviando}
              onClick={() => {
                if (!enviando) onCancelar()
              }}
              className="absolute inset-0 bg-black/25"
            />
            <motion.div
              ref={refPanel}
              id={panelId}
              role="group"
              aria-label={etiquetaPanel}
              initial={salto ? false : { opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={salto ? undefined : { opacity: 0, y: 28 }}
              transition={transicion}
              className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[min(88dvh,40rem)] w-full max-w-md flex-col gap-2 overflow-y-auto rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-md"
            >
              <p id={tituloId} className="px-2 pb-1 text-sm text-black/60">
                {paso === 'tipo' ? 'Tipo de envío' : 'Estado'}
              </p>
              {opciones}
            </motion.div>
          </motion.div>
        )
      ) : null}
    </AnimatePresence>,
    document.body,
  )

  return (
    <div className="relative">
      <button
        ref={refBoton}
        type="button"
        aria-expanded={abierto}
        aria-controls={panelId}
        aria-haspopup={esPc ? 'true' : 'dialog'}
        aria-label={`Estado de ${codigo}`}
        disabled={ocupado || enviando}
        onClick={() => (abierto ? onCancelar() : onAbrir())}
        className={
          compacto
            ? `${botonCompacto} gap-1 ${colorEstado}`
            : `${boton} justify-between ${colorEstado}`
        }
      >
        {etiqueta}
        {abierto ? <ChevronUp aria-hidden size={18} /> : <ChevronDown aria-hidden size={18} />}
      </button>
      {panel}
    </div>
  )
}

function HistorialSemana({
  acento,
  envios,
  todos,
  error,
  cargando,
  esPc,
  busqueda,
  reducirMovimiento,
  onBusqueda,
  onCanastas,
  onReintentar,
}: {
  acento: string
  envios: EnvioSemana[]
  todos: EnvioSemana[]
  error: string | null
  cargando: boolean
  esPc: boolean
  busqueda: string
  reducirMovimiento: boolean | null
  onBusqueda: (valor: string) => void
  onCanastas: () => void
  onReintentar: () => void
}) {
  const tituloId = useId()
  const [abiertoId, setAbiertoId] = useState<string | null>(null)
  const totales = totalesSemana(todos.map((envio) => ({ total: envio.total, prendas: envio.prendas })))

  function alternar(id: string) {
    setAbiertoId((actual) => (actual === id ? null : id))
  }

  return (
    <section aria-labelledby={tituloId} className="flex flex-col gap-6 lg:gap-8">
      <div className="flex flex-col gap-5 rounded-3xl p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between lg:gap-8 lg:p-8" style={{ backgroundColor: acento }}>
        <h2 id={tituloId} className="min-w-0 font-display text-2xl uppercase leading-none tracking-wide lg:flex-1 lg:text-4xl">
          Historial de la semana
        </h2>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:gap-8">
          {!error && (!cargando || todos.length > 0) ? (
            <dl className="grid grid-cols-2 gap-6 lg:min-w-80 lg:gap-10">
              <div>
                <dt className="text-sm">Total generado</dt>
                <dd className="font-display text-2xl leading-none tracking-wide lg:text-3xl">{formatearDolares(totales.total)}</dd>
              </div>
              <div>
                <dt className="text-sm">Prendas</dt>
                <dd className="font-display text-2xl leading-none tracking-wide lg:text-3xl">{totales.prendas}</dd>
              </div>
            </dl>
          ) : null}
          <motion.button
            type="button"
            onClick={onCanastas}
            whileTap={reducirMovimiento ? undefined : toque}
            transition={{ duration: 0.15 }}
            className={`${boton} bg-black text-white lg:w-auto lg:shrink-0 lg:px-6`}
          >
            Canastas abiertas
          </motion.button>
        </div>
      </div>

      {!cargando && !error && todos.length > 0 ? (
        <BuscadorClientes valor={busqueda} onCambiar={onBusqueda} />
      ) : null}

      {cargando ? <IndicadorCarga>Cargando historial…</IndicadorCarga> : null}

      {!cargando && error ? (
        <button type="button" onClick={onReintentar} className={`${boton} bg-black text-white`}>
          Reintentar
        </button>
      ) : null}

      {!cargando && !error && todos.length === 0 ? (
        <p className={esPc ? 'text-base' : 'rounded-3xl bg-white px-5 py-8 text-center shadow-sm'}>
          Aún no hay envíos esta semana
        </p>
      ) : null}

      {!cargando && !error && todos.length > 0 && envios.length === 0 ? (
        <p className={esPc ? 'text-base' : 'rounded-3xl bg-white px-5 py-8 text-center shadow-sm'}>
          Ningún envío coincide con la búsqueda.
        </p>
      ) : null}

      {envios.length > 0 && esPc ? (
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left lg:[&_td]:px-5 lg:[&_td]:py-4 lg:[&_th]:px-5 lg:[&_th]:py-4">
              <caption className="sr-only">Historial de la semana</caption>
              <thead>
                <tr className="text-sm" style={{ backgroundColor: acento }}>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Fecha
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Código
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Tipo
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Prendas
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {envios.map((envio) => (
                  <FilasHistorial
                    key={envio.id}
                    envio={envio}
                    abierta={abiertoId === envio.id}
                    onAlternar={() => alternar(envio.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {envios.length > 0 && !esPc ? (
        <ul className="flex flex-col gap-3">
          {envios.map((envio) => (
            <FilaHistorial
              key={envio.id}
              envio={envio}
              abierta={abiertoId === envio.id}
              onAlternar={() => alternar(envio.id)}
            />
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function FilaHistorial({
  envio,
  abierta,
  onAlternar,
}: {
  envio: EnvioSemana
  abierta: boolean
  onAlternar: () => void
}) {
  const detalleId = useId()

  return (
    <li id={`envio-${envio.id}`} className="flex scroll-mt-4 flex-col rounded-3xl bg-white p-5 shadow-sm">
      <button
        type="button"
        aria-expanded={abierta}
        aria-controls={detalleId}
        onClick={onAlternar}
        className="touch-manipulation text-left [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
      >
        <span className="flex items-start gap-3">
          {abierta ? <ChevronUp aria-hidden size={22} className="mt-0.5 shrink-0" /> : <ChevronDown aria-hidden size={22} className="mt-0.5 shrink-0" />}
          <span className="min-w-0">
            <span className="block text-sm text-black/60">{textoFecha(envio.fecha)}</span>
            <span className="mt-1 block break-words font-display text-3xl uppercase leading-none tracking-wide">
              {envio.codigo}
            </span>
          </span>
        </span>
        <span className="mt-3 block text-base">
          {etiquetaTipo(envio.tipo)} · {textoCantidad(envio.prendas)} · {formatearDolares(envio.total)}
        </span>
      </button>
      <PanelDesplegable abierto={abierta}>
        <div className="pt-4">
          <DetalleEnvio id={detalleId} grupos={envio.detalle} dias={envio.dias} />
        </div>
      </PanelDesplegable>
    </li>
  )
}

function FilasHistorial({
  envio,
  abierta,
  onAlternar,
}: {
  envio: EnvioSemana
  abierta: boolean
  onAlternar: () => void
}) {
  const detalleId = useId()

  function alternarSiEsDato(evento: MouseEvent<HTMLTableRowElement>) {
    const destino = evento.target
    if (!(destino instanceof Element)) return
    if (destino.closest('a, button')) return
    onAlternar()
  }

  return (
    <>
      <tr
        id={`envio-${envio.id}`}
        className={`scroll-mt-4 border-b border-black/10 align-top ${abierta ? 'bg-black/[0.03]' : 'hover:bg-black/[0.03]'}`}
        onClick={alternarSiEsDato}
      >
        <td className="px-4 py-3">
          <button
            type="button"
            aria-expanded={abierta}
            aria-controls={detalleId}
            onClick={onAlternar}
            className="inline-flex items-center gap-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            {abierta ? <ChevronUp aria-hidden size={18} /> : <ChevronDown aria-hidden size={18} />}
            {textoFecha(envio.fecha)}
          </button>
        </td>
        <td className="px-4 py-3 font-display text-2xl uppercase leading-none tracking-wide">
          {envio.codigo}
        </td>
        <td className="px-4 py-3">{etiquetaTipo(envio.tipo)}</td>
        <td className="px-4 py-3 text-right text-xl font-bold tabular-nums">{envio.prendas}</td>
        <td className="px-4 py-3 text-right tabular-nums">{formatearDolares(envio.total)}</td>
      </tr>
      <FilaTablaDesplegable abierto={abierta} colSpan={5}>
        <div className="max-w-sm px-4 py-4 lg:max-w-lg">
          <DetalleEnvio id={detalleId} grupos={envio.detalle} dias={envio.dias} />
        </div>
      </FilaTablaDesplegable>
    </>
  )
}

function DetalleEnvio({
  id,
  grupos,
  dias,
}: {
  id: string
  grupos: GrupoPrecio[]
  dias: GrupoDia[]
}) {
  if (grupos.length === 0) {
    return (
      <p id={id} className="text-base">
        No hay detalle de prendas en esta venta.
      </p>
    )
  }

  return <ListaPrendas id={id} grupos={grupos} dias={dias} />
}

function textoCantidad(prendas: number): string {
  return `${prendas} ${prendas === 1 ? 'prenda' : 'prendas'}`
}

function textoFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-')
  const indice = Number(mes) - 1
  if (!anio || !dia || indice < 0 || indice > 11) return fecha
  return `${Number(dia)} ${meses[indice]}`
}

function etiquetaTipo(tipo: string): string {
  if (tipo === 'local' || tipo === 'uber' || tipo === 'servientrega') return etiquetasTipo[tipo]
  return tipo
}
