import { useEffect, useId, useState, type FormEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, Bell, Pencil } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Aviso } from '../components/Aviso.tsx'
import { EtiquetaEstado } from '../components/EtiquetaEstado.tsx'
import { FormularioAbono } from '../components/FormularioAbono.tsx'
import { IndicadorCarga } from '../components/IndicadorCarga.tsx'
import { Layout } from '../components/Layout.tsx'
import { secciones } from '../config/secciones.ts'
import { useConexion } from '../context/useConexion.ts'
import { abonoAtrasado } from '../lib/abonoAtrasado.ts'
import { formatearDolares } from '../lib/dinero.ts'
import { excedenteAbono, mensajeAbonoRegistrado, saldoPendiente, totalCanasta } from '../lib/reglas.ts'
import {
  agregarAbono,
  editarAbono,
  listarAbonos,
  listarCanastaCliente,
  listarResumenAbonos,
  listarUltimosAbonos,
  obtenerCliente,
  type Abono,
  type Cliente,
  type Resultado,
  type ResumenClienteAbono,
} from '../services/clientes.ts'

type ModoFormulario =
  | { clienteId: string; tipo: 'nuevo' }
  | { clienteId: string; tipo: 'editar'; abono: Abono }

type AvisoEstado = { texto: string; tono: 'ok' | 'error' }

const boton =
  'inline-flex min-h-12 w-full touch-manipulation items-center justify-center rounded-full px-5 py-3 text-base [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50'

const toque = { scale: 0.97 }
const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function Abonos() {
  const { nombre, subtitulo, acento } = secciones.abonos
  const [params, setParams] = useSearchParams()
  const clienteId = params.get('cliente')
  const [busqueda, setBusqueda] = useState('')
  const [consulta, setConsulta] = useState('')
  const [recargaLista, setRecargaLista] = useState(0)
  const [recargaDetalle, setRecargaDetalle] = useState(0)
  const [clientes, setClientes] = useState<ResumenClienteAbono[]>([])
  const [ultimosAbonos, setUltimosAbonos] = useState<Record<string, string> | null>(null)
  const [cargandoLista, setCargandoLista] = useState(true)
  const [claveCargada, setClaveCargada] = useState<string | null>(null)
  const [errorLista, setErrorLista] = useState<string | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [total, setTotal] = useState<number | null>(null)
  const [abonos, setAbonos] = useState<Abono[]>([])
  const [errorDetalle, setErrorDetalle] = useState<{ id: string; texto: string } | null>(null)
  const [errorAbonos, setErrorAbonos] = useState<{ id: string; texto: string } | null>(null)
  const [modo, setModo] = useState<ModoFormulario | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<AvisoEstado | null>(null)

  useEffect(() => {
    const tiempo = window.setTimeout(() => setConsulta(busqueda.trim()), 250)
    return () => window.clearTimeout(tiempo)
  }, [busqueda])

  useEffect(() => {
    if (clienteId) return
    let vigente = true

    void (async () => {
      setCargandoLista(true)
      setErrorLista(null)
      setUltimosAbonos(null)
      const resultado = await listarResumenAbonos(consulta)
      if (!vigente) return
      const fechas = resultado.ok ? await listarUltimosAbonos(resultado.datos.map((fila) => fila.id)) : null
      if (!vigente) return
      setCargandoLista(false)
      if (!resultado.ok) {
        setClientes([])
        setUltimosAbonos(null)
        setErrorLista(resultado.mensaje)
        return
      }
      setClientes(resultado.datos)
      setUltimosAbonos(fechas?.ok ? fechas.datos : null)
      setErrorLista(null)
      if (fechas && !fechas.ok) setAviso({ texto: fechas.mensaje, tono: 'error' })
      else setAviso((actual) => (actual?.tono === 'error' ? null : actual))
    })()

    return () => {
      vigente = false
    }
  }, [clienteId, consulta, recargaLista])

  const claveDetalle = clienteId == null ? null : `${clienteId}:${recargaDetalle}`

  useEffect(() => {
    if (!clienteId || !claveDetalle || claveCargada === claveDetalle) return

    let vigente = true
    const clave = claveDetalle
    const id = clienteId

    void (async () => {
      const clienteResultado = await obtenerCliente(id)
      if (!vigente) return
      if (!clienteResultado.ok) {
        setCliente(null)
        setTotal(null)
        setAbonos([])
        setErrorDetalle({ id, texto: clienteResultado.mensaje })
        setErrorAbonos(null)
        setClaveCargada(clave)
        return
      }

      const [canastaResultado, abonosResultado] = await Promise.all([
        listarCanastaCliente(id),
        listarAbonos(id),
      ])
      if (!vigente) return
      setCliente(clienteResultado.datos)
      if (!canastaResultado.ok) {
        setTotal(null)
        setErrorDetalle({ id, texto: canastaResultado.mensaje })
      } else {
        setTotal(totalCanasta(canastaResultado.datos))
        setErrorDetalle(null)
      }
      if (!abonosResultado.ok) {
        setAbonos([])
        setErrorAbonos({ id, texto: abonosResultado.mensaje })
      } else {
        setAbonos(abonosResultado.datos)
        setErrorAbonos(null)
      }
      setClaveCargada(clave)
    })()

    return () => {
      vigente = false
    }
  }, [clienteId, claveDetalle, claveCargada])

  function sinAbono(clienteId: string) {
    if (!ultimosAbonos) return false
    return abonoAtrasado(ultimosAbonos[clienteId], new Date())
  }

  function mostrar(texto: string, tono: AvisoEstado['tono']) {
    setAviso({ texto, tono })
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }

  function elegirCliente(id: string) {
    setAviso(null)
    setModo(null)
    setParams({ cliente: id })
  }

  function volverABuscar() {
    setAviso(null)
    setModo(null)
    setParams({})
  }

  async function guardarAbono(monto: number, fecha: string): Promise<Resultado<Cliente>> {
    if (!cliente || total == null) {
      return { ok: false, mensaje: 'No se pudo registrar el abono. Inténtalo de nuevo.' }
    }

    const saldoAntes = cliente.saldo_favor
    const estabaInactivo = cliente.estado === 'inactivo'
    const excedente = excedenteAbono(total, saldoAntes, monto)
    setOcupado(true)
    const resultado = await agregarAbono(cliente.id, monto, fecha)
    if (!resultado.ok) {
      setOcupado(false)
      return resultado
    }

    const lista = await listarAbonos(cliente.id)
    setOcupado(false)
    setCliente(resultado.datos)
    setModo(null)
    if (lista.ok) {
      setAbonos(lista.datos)
      setErrorAbonos(null)
    } else {
      setErrorAbonos({ id: cliente.id, texto: lista.mensaje })
    }
    mostrar(mensajeAbonoRegistrado(excedente, estabaInactivo && resultado.datos.estado === 'activo'), 'ok')
    return resultado
  }

  async function guardarEdicion(
    abono: Abono,
    monto: number,
    fecha: string,
  ): Promise<Resultado<Cliente>> {
    if (!cliente || cliente.id !== clienteId) {
      return { ok: false, mensaje: 'No se pudo guardar el abono. Inténtalo de nuevo.' }
    }

    const estabaInactivo = cliente.estado === 'inactivo'
    setOcupado(true)
    const resultado = await editarAbono(cliente.id, abono.id, monto, fecha)
    if (!resultado.ok) {
      setOcupado(false)
      return resultado
    }

    const lista = await listarAbonos(cliente.id)
    setOcupado(false)
    setCliente(resultado.datos)
    setModo(null)
    if (lista.ok) {
      setAbonos(lista.datos)
      setErrorAbonos(null)
    } else {
      setErrorAbonos({ id: cliente.id, texto: lista.mensaje })
    }
    const reactivo = estabaInactivo && resultado.datos.estado === 'activo'
    mostrar(reactivo ? 'Abono actualizado. El cliente volvió a estar activo.' : 'Abono actualizado.', 'ok')
    return resultado
  }

  const detalleVisible = cliente != null && cliente.id === clienteId
  const modoVisible = modo?.clienteId === clienteId ? modo : null
  const formularioAbierto = modoVisible != null && detalleVisible
  const textoErrorDetalle = errorDetalle?.id === clienteId ? errorDetalle.texto : null
  const textoErrorAbonos = errorAbonos?.id === clienteId ? errorAbonos.texto : null
  const cargandoDetalleVisible = claveDetalle != null && claveCargada !== claveDetalle

  return (
    <Layout titulo={nombre} subtitulo={subtitulo} acento={acento}>
      {aviso ? <Aviso tono={aviso.tono}>{aviso.texto}</Aviso> : null}

      {formularioAbierto && cliente && modoVisible ? (
        <FormularioAbono
          key={modoVisible.tipo === 'editar' ? modoVisible.abono.id : 'nuevo'}
          cliente={cliente}
          acento={acento}
          guardando={ocupado}
          textoCancelar="Volver"
          inicial={
            modoVisible.tipo === 'editar'
              ? { monto: modoVisible.abono.monto, fecha: modoVisible.abono.fecha }
              : undefined
          }
          onCancelar={() => setModo(null)}
          onGuardar={
            modoVisible.tipo === 'editar'
              ? (monto, fecha) => guardarEdicion(modoVisible.abono, monto, fecha)
              : guardarAbono
          }
        />
      ) : null}

      {clienteId && !formularioAbierto ? (
        <DetalleAbono
          acento={acento}
          cliente={detalleVisible ? cliente : null}
          total={detalleVisible ? total : null}
          abonos={detalleVisible ? abonos : []}
          cargando={cargandoDetalleVisible}
          errorDetalle={cargandoDetalleVisible ? null : textoErrorDetalle}
          errorAbonos={cargandoDetalleVisible ? null : textoErrorAbonos}
          sinAbono={
            detalleVisible && !cargandoDetalleVisible && textoErrorAbonos == null
              ? abonoAtrasado(abonos[0]?.fecha, new Date())
              : false
          }
          onVolver={volverABuscar}
          onReintentar={() => setRecargaDetalle((valor) => valor + 1)}
          onAgregar={() => {
            setAviso(null)
            if (clienteId) setModo({ clienteId, tipo: 'nuevo' })
          }}
          onEditar={(abono) => {
            setAviso(null)
            if (clienteId) setModo({ clienteId, tipo: 'editar', abono })
          }}
        />
      ) : null}

      {!clienteId ? (
        <Buscador
          busqueda={busqueda}
          consulta={consulta}
          clientes={clientes}
          cargando={cargandoLista}
          sinAbono={sinAbono}
          error={errorLista}
          onBusqueda={setBusqueda}
          onBuscarYa={() => setConsulta(busqueda.trim())}
          onElegir={(elegido) => elegirCliente(elegido.id)}
          onReintentar={() => setRecargaLista((valor) => valor + 1)}
        />
      ) : null}
    </Layout>
  )
}

function Buscador({
  busqueda,
  consulta,
  clientes,
  cargando,
  sinAbono,
  error,
  onBusqueda,
  onBuscarYa,
  onElegir,
  onReintentar,
}: {
  busqueda: string
  consulta: string
  clientes: ResumenClienteAbono[]
  cargando: boolean
  sinAbono: (clienteId: string) => boolean
  error: string | null
  onBusqueda: (valor: string) => void
  onBuscarYa: () => void
  onElegir: (cliente: ResumenClienteAbono) => void
  onReintentar: () => void
}) {
  const idBusqueda = useId()
  const reducirMovimiento = useReducedMotion()
  const sinResultados = !cargando && clientes.length === 0 && !error

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-2"
        onSubmit={(evento: FormEvent<HTMLFormElement>) => {
          evento.preventDefault()
          onBuscarYa()
        }}
      >
        <label className="text-sm" htmlFor={idBusqueda}>
          Buscar cliente
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

      {!cargando && error ? (
        <div className="flex flex-col gap-3">
          <Aviso>{error}</Aviso>
          <button type="button" onClick={onReintentar} className={`${boton} bg-black text-white`}>
            Reintentar
          </button>
        </div>
      ) : null}

      {sinResultados ? (
        <p className="rounded-3xl bg-white px-5 py-8 text-center shadow-sm">
          {consulta ? 'Ningún cliente coincide con la búsqueda.' : 'Aún no hay clientes'}
        </p>
      ) : null}

      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
        {clientes.map((cliente) => {
          const atrasado = sinAbono(cliente.id)
          return (
          <li key={cliente.id} className="h-full">
            <motion.button
              type="button"
              onClick={() => onElegir(cliente)}
              whileTap={reducirMovimiento ? undefined : toque}
              transition={{ duration: 0.15 }}
              className={`flex h-full w-full touch-manipulation flex-col gap-4 rounded-3xl p-5 text-left shadow-sm [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${atrasado ? 'bg-peligro' : 'bg-white'}`}
            >
              <span className="flex items-start justify-between gap-4">
                <span className="flex min-w-0 flex-1 items-baseline gap-3">
                  <span className="shrink-0 font-display text-4xl uppercase leading-none tracking-wide">
                    {cliente.codigo}
                  </span>
                  <span className="flex min-w-0 items-center gap-1.5 text-sm">
                    {cliente.nombre ? <span className="min-w-0 truncate">{cliente.nombre}</span> : null}
                    {atrasado ? <CampanaAbono /> : null}
                  </span>
                </span>
                <EtiquetaEstado estado={cliente.estado} />
              </span>
              <span className="grid grid-cols-3 gap-2">
                <Cifra etiqueta="Total" valor={cliente.total} />
                <Cifra etiqueta="Saldo" valor={cliente.saldo} />
                <Cifra etiqueta="Abonado" valor={cliente.saldo_favor} />
              </span>
            </motion.button>
          </li>
          )
        })}
      </ul>
    </div>
  )
}

function CampanaAbono() {
  return (
    <span className="inline-flex shrink-0" title="Sin abono en 5 días">
      <Bell aria-hidden size={16} strokeWidth={2.25} />
      <span className="sr-only">Sin abono en los últimos 5 días</span>
    </span>
  )
}

function DetalleAbono({
  acento,
  cliente,
  total,
  abonos,
  cargando,
  errorDetalle,
  errorAbonos,
  sinAbono,
  onVolver,
  onReintentar,
  onAgregar,
  onEditar,
}: {
  acento: string
  cliente: Cliente | null
  total: number | null
  abonos: Abono[]
  cargando: boolean
  errorDetalle: string | null
  errorAbonos: string | null
  sinAbono: boolean
  onVolver: () => void
  onReintentar: () => void
  onAgregar: () => void
  onEditar: (abono: Abono) => void
}) {
  const { enLinea } = useConexion()
  const tituloId = useId()

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={onVolver}
        className="inline-flex min-h-11 w-fit touch-manipulation items-center gap-2 rounded-full bg-black/5 px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
      >
        <ArrowLeft aria-hidden size={18} strokeWidth={2} />
        Buscar otro
      </button>

      {cargando ? <IndicadorCarga>Cargando cliente…</IndicadorCarga> : null}

      {!cargando && errorDetalle ? (
        <div className="flex flex-col gap-3">
          <Aviso>{errorDetalle}</Aviso>
          <button type="button" onClick={onReintentar} className={`${boton} bg-black text-white`}>
            Reintentar
          </button>
        </div>
      ) : null}

      {!cargando && cliente && total != null ? (
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
        <article
          className={`flex flex-col gap-5 rounded-3xl p-5 shadow-sm lg:p-8 ${sinAbono ? 'bg-peligro' : 'bg-white'}`}
        >
          <div className="flex items-start justify-between gap-4">
            <h2 className="min-w-0 break-words font-display text-5xl uppercase leading-none tracking-wide">
              {cliente.codigo}
            </h2>
            <EtiquetaEstado estado={cliente.estado} />
          </div>
          {cliente.nombre || sinAbono ? (
            <p className="flex items-center gap-1.5 break-words text-sm">
              {cliente.nombre ? <span className="min-w-0 break-words">{cliente.nombre}</span> : null}
              {sinAbono ? <CampanaAbono /> : null}
            </p>
          ) : null}
          {cliente.estado === 'inactivo' ? (
            <p className="text-sm leading-relaxed">
              Está inactivo. Si el abono deja saldo a favor, vuelve a estar activo.
            </p>
          ) : null}
          <dl className="flex flex-col gap-4">
            <Monto etiqueta="Total de la canasta" valor={total} />
            <Monto etiqueta="Saldo pendiente" valor={saldoPendiente(total, cliente.saldo_favor)} />
            <Monto etiqueta="Abonado" valor={cliente.saldo_favor} />
          </dl>
          <button
            type="button"
            onClick={onAgregar}
            disabled={!enLinea}
            className={boton}
            style={{ backgroundColor: acento }}
          >
            Agregar abono
          </button>
        </article>
        <section className="flex flex-col gap-3" aria-labelledby={tituloId}>
          <h3 id={tituloId} className="font-display text-3xl uppercase leading-none tracking-wide">
            Abonos
          </h3>
          {errorAbonos ? (
            <div className="flex flex-col gap-3">
              <Aviso>{errorAbonos}</Aviso>
              <button type="button" onClick={onReintentar} className={`${boton} bg-black text-white`}>
                Reintentar
              </button>
            </div>
          ) : abonos.length === 0 ? (
            <p className="rounded-3xl bg-white px-5 py-8 text-center shadow-sm">Aún no hay abonos.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {abonos.map((abono) => (
                <li
                  key={abono.id}
                  className="flex items-center justify-between gap-3 rounded-3xl bg-white px-5 py-4 shadow-sm"
                >
                  <span className="text-sm text-black/60">{textoFecha(abono.fecha)}</span>
                  <span className="ml-auto text-lg font-semibold tabular-nums">
                    {formatearDolares(abono.monto)}
                  </span>
                  <button
                    type="button"
                    aria-label={`Editar abono del ${textoFecha(abono.fecha)} por ${formatearDolares(abono.monto)}`}
                    onClick={() => onEditar(abono)}
                    className="inline-flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-full bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                  >
                    <Pencil aria-hidden size={18} strokeWidth={2} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        </div>
      ) : null}
    </div>
  )
}

function Cifra({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <span>
      <span className="block text-sm text-black/60">{etiqueta}</span>
      <span className="block text-base font-semibold tabular-nums">{formatearDolares(valor)}</span>
    </span>
  )
}

function Monto({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-sm text-black/60">{etiqueta}</dt>
      <dd className="text-xl font-semibold tabular-nums">{formatearDolares(valor)}</dd>
    </div>
  )
}

function textoFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-')
  const indice = Number(mes) - 1
  if (!anio || !dia || indice < 0 || indice > 11) return fecha
  return `${Number(dia)} ${meses[indice]} ${anio}`
}
