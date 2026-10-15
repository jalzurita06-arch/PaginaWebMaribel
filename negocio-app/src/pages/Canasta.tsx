import { useEffect, useId, useRef, useState, type MouseEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Aviso } from '../components/Aviso.tsx'
import { IndicadorCarga } from '../components/IndicadorCarga.tsx'
import { Layout } from '../components/Layout.tsx'
import { secciones } from '../config/secciones.ts'
import { useConexion } from '../context/useConexion.ts'
import { MENSAJE_FALLO_RED } from '../lib/conexion.ts'
import { formatearDolares } from '../lib/dinero.ts'
import { totalesCanastasAbiertas, totalesSemana, type GrupoPrecio } from '../lib/reglas.ts'
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

type AvisoEstado = { texto: string; tono: 'ok' | 'error' }
type PasoSelector = 'menu' | 'tipo'
type VistaCanasta = 'abiertas' | 'historial'
type Selector = { clienteId: string; paso: PasoSelector; tipo: TipoEnvio | null }

const botonBase =
  'inline-flex touch-manipulation items-center justify-center rounded-full text-center [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50'

const boton = `${botonBase} min-h-12 w-full px-4 py-3 text-base`

const botonCompacto = `${botonBase} min-h-10 w-auto whitespace-nowrap px-4 py-2 text-sm`

const consultaPc = '(min-width: 1024px)'

const etiquetasTipo: Record<TipoEnvio, string> = {
  local: 'Local',
  uber: 'Uber',
  servientrega: 'Servientrega',
}

const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const toque = { scale: 0.97 }
const Enlace = motion.create(Link)

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
  const { enLinea } = useConexion()
  const esPc = usePantallaPc()
  const montado = useRef(true)
  const enviando = useRef(false)
  const reducirMovimiento = useReducedMotion()
  const [vista, setVista] = useState<VistaCanasta>('abiertas')
  const [aviso, setAviso] = useState<AvisoEstado | null>(null)
  const [cargando, setCargando] = useState(true)
  const [canastas, setCanastas] = useState<CanastaAbierta[]>([])
  const [envios, setEnvios] = useState<EnvioSemana[]>([])
  const [errorCanastas, setErrorCanastas] = useState<string | null>(null)
  const [errorHistorial, setErrorHistorial] = useState<string | null>(null)
  const [recarga, setRecarga] = useState(0)
  const [abiertaId, setAbiertaId] = useState<string | null>(null)
  const [selector, setSelector] = useState<Selector | null>(null)
  const [enviandoId, setEnviandoId] = useState<string | null>(null)

  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])

  useEffect(() => {
    let vigente = true

    void (async () => {
      setCargando(true)
      const borrado = await borrarEnviosAntiguos()
      if (!vigente) return
      const [canastasResultado, enviosResultado] = await Promise.all([
        listarCanastasAbiertas(),
        listarEnviosSemana(),
      ])
      if (!vigente) return

      setCargando(false)
      if (!canastasResultado.ok) {
        setCanastas([])
        setErrorCanastas(canastasResultado.mensaje)
      } else {
        setCanastas(canastasResultado.datos)
        setErrorCanastas(null)
      }
      if (!enviosResultado.ok) {
        setEnvios([])
        setErrorHistorial(enviosResultado.mensaje)
      } else {
        setEnvios(enviosResultado.datos)
        setErrorHistorial(null)
      }

      if (!canastasResultado.ok) setAviso({ texto: canastasResultado.mensaje, tono: 'error' })
      else if (!enviosResultado.ok) setAviso({ texto: enviosResultado.mensaje, tono: 'error' })
      else if (!borrado.ok) setAviso({ texto: borrado.mensaje, tono: 'error' })
      else setAviso((actual) => (actual?.tono === 'error' ? null : actual))
    })()

    return () => {
      vigente = false
    }
  }, [recarga])

  function mostrar(texto: string, tono: AvisoEstado['tono']) {
    setAviso({ texto, tono })
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
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

    setCanastas((actual) => actual.filter((fila) => fila.clienteId !== canasta.clienteId))
    setEnvios((actual) => [
      resultado.datos.envio,
      ...actual.filter((envio) => envio.id !== resultado.datos.envio.id),
    ])
    setSelector(null)
    setAbiertaId((actual) => (actual === canasta.clienteId ? null : actual))
    setErrorHistorial(null)
    mostrar(mensajeEnvioConfirmado(resultado.datos.nuevoSaldoFavor), 'ok')

    const [canastasNuevas, enviosNuevos] = await Promise.all([
      listarCanastasAbiertas(),
      listarEnviosSemana(),
    ])
    if (!montado.current) return
    if (canastasNuevas.ok) setCanastas(canastasNuevas.datos)
    if (enviosNuevos.ok) setEnvios(enviosNuevos.datos)
  }

  const ocupado = enviandoId !== null
  const resumenAbiertas = totalesCanastasAbiertas(canastas)

  function irA(destino: VistaCanasta) {
    setVista(destino)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
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

          {!cargando && !errorCanastas && canastas.length === 0 ? (
            <p className={esPc ? 'text-base' : 'rounded-3xl bg-white px-5 py-8 text-center shadow-sm'}>
              No hay canastas abiertas.
            </p>
          ) : null}

          {canastas.length > 0 && esPc ? (
            <TablaCanastas
              canastas={canastas}
              acento={acento}
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
            />
          ) : null}

          {canastas.length > 0 && !esPc ? (
            <ul className="flex flex-col gap-3">
              {canastas.map((canasta) => (
                <FilaCanasta
                  key={canasta.clienteId}
                  canasta={canasta}
                  acento={acento}
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
                />
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <>
          <motion.button
            type="button"
            onClick={() => irA('abiertas')}
            whileTap={reducirMovimiento ? undefined : toque}
            transition={{ duration: 0.15 }}
            className={`${boton} bg-black/5 lg:w-auto lg:self-start lg:px-6`}
          >
            Canastas abiertas
          </motion.button>
          <HistorialSemana
            acento={acento}
            envios={envios}
            error={errorHistorial}
            cargando={cargando}
            esPc={esPc}
            onReintentar={() => setRecarga((valor) => valor + 1)}
          />
        </>
      )}
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

function FilaCanasta({
  canasta,
  acento,
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
}: {
  canasta: CanastaAbierta
  acento: string
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
}) {
  const detalleId = useId()

  return (
    <li className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm">
      <button
        type="button"
        aria-expanded={abierta}
        aria-controls={detalleId}
        onClick={onAlternar}
        className="touch-manipulation text-left [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
      >
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0 break-words font-display text-4xl uppercase leading-none tracking-wide">
            {canasta.codigo}
          </span>
          <span className="shrink-0 pt-1 text-xl font-bold leading-none">{textoCantidad(canasta.prendas)}</span>
        </span>
        <span className="mt-4 grid grid-cols-3 gap-2">
          <Monto etiqueta="Total" valor={canasta.total} />
          <Monto etiqueta="Abono" valor={canasta.saldoFavor} />
          <Monto etiqueta="Saldo" valor={canasta.saldo} />
        </span>
      </button>

      {abierta ? <ListaPrendas id={detalleId} grupos={canasta.grupos} /> : null}

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
    </li>
  )
}

function TablaCanastas({
  canastas,
  acento,
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
}: {
  canastas: CanastaAbierta[]
  acento: string
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
}) {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-left lg:[&_td]:px-5 lg:[&_td]:py-4 lg:[&_th]:px-5 lg:[&_th]:py-4">
          <caption className="sr-only">Canastas abiertas</caption>
          <thead>
            <tr className="text-sm" style={{ backgroundColor: acento }}>
              <th scope="col" className="px-4 py-3 font-semibold">
                Código
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
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
}: {
  canasta: CanastaAbierta
  acento: string
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
        className={`border-b border-black/10 align-top ${abierta ? 'bg-black/[0.03]' : 'hover:bg-black/[0.03]'}`}
        onClick={alternarSiEsDato}
      >
        <td className="px-4 py-3">
          <button
            type="button"
            aria-expanded={abierta}
            aria-controls={detalleId}
            onClick={onAlternar}
            className="break-words text-left font-display text-2xl uppercase leading-none tracking-wide focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            {canasta.codigo}
          </button>
        </td>
        <td className="px-4 py-3 text-right text-xl font-bold tabular-nums leading-none">
          {canasta.prendas}
        </td>
        <td className="px-4 py-3 text-right tabular-nums">{formatearDolares(canasta.total)}</td>
        <td className="px-4 py-3 text-right tabular-nums">{formatearDolares(canasta.saldoFavor)}</td>
        <td className="px-4 py-3 text-right tabular-nums">{formatearDolares(canasta.saldo)}</td>
        <td className="px-4 py-3">
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
      {abierta ? (
        <tr className="border-b border-black/10 bg-fondo">
          <td colSpan={6} className="px-4 py-4">
            <div className="max-w-sm lg:max-w-lg">
              <ListaPrendas id={detalleId} grupos={canasta.grupos} />
            </div>
          </td>
        </tr>
      ) : null}
    </>
  )
}

function ListaPrendas({ id, grupos }: { id: string; grupos: GrupoPrecio[] }) {
  const tituloId = `${id}-titulo`

  return (
    <section id={id} className="flex flex-col gap-3" aria-labelledby={tituloId}>
      <h3 id={tituloId} className="text-base">
        Prendas
      </h3>
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
    <div className={compacto ? 'flex flex-wrap items-start justify-end gap-2' : 'flex flex-col gap-4'}>
      <div className={compacto ? 'contents' : 'grid grid-cols-2 gap-3'}>
        <Enlace
          to={`/compartir/${canasta.clienteId}`}
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
          to={`/abonos?cliente=${encodeURIComponent(canasta.clienteId)}`}
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
      <div className={compacto ? 'w-44' : undefined}>
        <SelectorEnvio
          codigo={canasta.codigo}
          acento={acento}
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
    </div>
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
  const panelId = useId()
  const refPanel = useRef<HTMLDivElement>(null)
  const etiqueta = abierto && paso === 'tipo' ? 'Enviado' : 'Bodega'

  useEffect(() => {
    if (!abierto) return
    refPanel.current?.querySelector('button')?.focus()
  }, [abierto, paso])

  useEffect(() => {
    if (!abierto) return
    function cerrar(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && !enviando) onCancelar()
    }
    window.addEventListener('keydown', cerrar)
    return () => window.removeEventListener('keydown', cerrar)
  }, [abierto, enviando, onCancelar])

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={abierto}
        aria-controls={panelId}
        aria-label={`Estado de ${codigo}`}
        disabled={ocupado || enviando}
        onClick={() => (abierto ? onCancelar() : onAbrir())}
        className="inline-flex min-h-12 w-full touch-manipulation items-center justify-between rounded-full px-5 py-3 text-base [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50"
        style={{ backgroundColor: acento }}
      >
        {etiqueta}
        {abierto ? <ChevronUp aria-hidden size={18} /> : <ChevronDown aria-hidden size={18} />}
      </button>

      {abierto ? (
        <div
          ref={refPanel}
          id={panelId}
          role="group"
          aria-label={paso === 'tipo' ? `Tipo de envío de ${codigo}` : `Estado de ${codigo}`}
          className="flex flex-col gap-2 rounded-3xl bg-fondo p-3"
        >
          {paso === 'menu' ? (
            <>
              <button
                type="button"
                aria-pressed
                onClick={onBodega}
                className={`${boton} bg-white`}
              >
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
                  style={{ backgroundColor: tipo === opcion ? acento : '#fff', color: '#000' }}
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
              <button type="button" disabled={enviando} onClick={onCancelar} className={`${boton} bg-white`}>
                Cancelar
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}

function HistorialSemana({
  acento,
  envios,
  error,
  cargando,
  esPc,
  onReintentar,
}: {
  acento: string
  envios: EnvioSemana[]
  error: string | null
  cargando: boolean
  esPc: boolean
  onReintentar: () => void
}) {
  const tituloId = useId()
  const totales = totalesSemana(envios.map((envio) => ({ total: envio.total, prendas: envio.prendas })))

  return (
    <section aria-labelledby={tituloId} className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-3xl p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between lg:gap-8 lg:p-8" style={{ backgroundColor: acento }}>
        <h2 id={tituloId} className="font-display text-4xl uppercase leading-none tracking-wide">
          Historial de la semana
        </h2>
        {!error && (!cargando || envios.length > 0) ? (
          <dl className="mt-4 grid grid-cols-2 gap-6 lg:mt-0 lg:min-w-80 lg:gap-10">
            <div>
              <dt className="text-sm">Total generado</dt>
              <dd className="font-display text-3xl leading-none tracking-wide">{formatearDolares(totales.total)}</dd>
            </div>
            <div>
              <dt className="text-sm">Prendas</dt>
              <dd className="font-display text-3xl leading-none tracking-wide">{totales.prendas}</dd>
            </div>
          </dl>
        ) : null}
      </div>

      {cargando ? <IndicadorCarga>Cargando historial…</IndicadorCarga> : null}

      {!cargando && error ? (
        <button type="button" onClick={onReintentar} className={`${boton} bg-black text-white`}>
          Reintentar
        </button>
      ) : null}

      {!cargando && !error && envios.length === 0 ? (
        <p className={esPc ? 'text-base' : 'rounded-3xl bg-white px-5 py-8 text-center shadow-sm'}>
          Aún no hay envíos esta semana
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
                  <tr key={envio.id} className="border-b border-black/10 last:border-b-0">
                    <td className="px-4 py-3">{textoFecha(envio.fecha)}</td>
                    <td className="px-4 py-3 font-display text-2xl uppercase leading-none tracking-wide">
                      {envio.codigo}
                    </td>
                    <td className="px-4 py-3">{etiquetaTipo(envio.tipo)}</td>
                    <td className="px-4 py-3 text-right text-xl font-bold tabular-nums">{envio.prendas}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatearDolares(envio.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {envios.length > 0 && !esPc ? (
        <ul className="flex flex-col gap-3">
          {envios.map((envio) => (
            <li key={envio.id} className="rounded-3xl bg-white p-5 shadow-sm">
              <p className="text-sm text-black/60">{textoFecha(envio.fecha)}</p>
              <p className="mt-1 break-words font-display text-3xl uppercase leading-none tracking-wide">
                {envio.codigo}
              </p>
              <p className="mt-3 text-base">
                {etiquetaTipo(envio.tipo)} · {textoCantidad(envio.prendas)} · {formatearDolares(envio.total)}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
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
