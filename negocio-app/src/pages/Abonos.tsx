import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { VistaAnimada } from '../components/PanelDesplegable.tsx'
import { Pencil } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Aviso } from '../components/Aviso.tsx'
import { CampanaAbono } from '../components/CampanaAbono.tsx'
import { EtiquetaEstado } from '../components/EtiquetaEstado.tsx'
import { FormularioAbono } from '../components/FormularioAbono.tsx'
import { IndicadorCarga } from '../components/IndicadorCarga.tsx'
import { Layout } from '../components/Layout.tsx'
import { secciones } from '../config/secciones.ts'
import { useConexion } from '../context/useConexion.ts'
import { abonoAtrasado } from '../lib/abonoAtrasado.ts'
import { coincideCliente } from '../lib/busqueda.ts'
import { CLAVE_FECHAS_ABONO, CLAVE_RESUMEN_ABONOS, claveDetalleAbono, leerCache, reemplazarCache } from '../lib/cacheLectura.ts'
import { subirAlInicio } from '../lib/dispositivo.ts'
import { useDatos } from '../lib/useDatos.ts'
import { estadoCanastaAbierta, vieneDeCanasta } from '../lib/navegacion.ts'
import { formatearDolares } from '../lib/dinero.ts'
import { excedenteAbono, mensajeAbonoRegistrado, saldoPendiente, totalCanasta } from '../lib/reglas.ts'
import {
  agregarAbono,
  editarAbono,
  listarAbonos,
  listarCanastaCliente,
  listarFechasAbono,
  listarResumenAbonos,
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

type DetalleGuardado = { cliente: Cliente; total: number; abonos: Abono[] }

export function Abonos() {
  const { nombre, subtitulo, acento } = secciones.abonos
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const clienteId = params.get('cliente')
  const desdeCanasta = vieneDeCanasta('/abonos', params)
  const [busqueda, setBusqueda] = useState('')
  const [recargaLista, setRecargaLista] = useState(0)
  const [recargaDetalle, setRecargaDetalle] = useState(0)
  const resumen = useDatos(CLAVE_RESUMEN_ABONOS, () => listarResumenAbonos(), recargaLista, !clienteId)
  const fechas = useDatos(CLAVE_FECHAS_ABONO, () => listarFechasAbono(), recargaLista, !clienteId)
  const consulta = busqueda.trim()
  const clientes = useMemo(
    () => (resumen.datos ?? []).filter((fila) => coincideCliente(consulta, fila.codigo, fila.nombre)),
    [consulta, resumen.datos],
  )
  const cargandoLista = resumen.esperando && clientes.length === 0
  const errorLista = resumen.error
  const [claveCargada, setClaveCargada] = useState<string | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [total, setTotal] = useState<number | null>(null)
  const [abonos, setAbonos] = useState<Abono[]>([])
  const [errorDetalle, setErrorDetalle] = useState<{ id: string; texto: string } | null>(null)
  const [errorAbonos, setErrorAbonos] = useState<{ id: string; texto: string } | null>(null)
  const [modo, setModo] = useState<ModoFormulario | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<AvisoEstado | null>(null)
  const epocaDetalle = useRef(0)

  useEffect(() => {
    if (!fechas.error) {
      setAviso((actual) => (actual?.tono === 'error' ? null : actual))
      return
    }
    setAviso({ texto: fechas.error, tono: 'error' })
  }, [fechas.error])

  const claveDetalle = clienteId == null ? null : `${clienteId}:${recargaDetalle}`

  useEffect(() => {
    if (!clienteId || !claveDetalle || claveCargada === claveDetalle) return

    let vigente = true
    const marca = epocaDetalle.current
    const clave = claveDetalle
    const id = clienteId
    const guardado = leerCache<DetalleGuardado>(claveDetalleAbono(id))
    if (guardado) {
      setCliente(guardado.cliente)
      setTotal(guardado.total)
      setAbonos(guardado.abonos)
      setErrorDetalle(null)
      setErrorAbonos(null)
    }

    void (async () => {
      const [clienteResultado, canastaResultado, abonosResultado] = await Promise.all([
        obtenerCliente(id),
        listarCanastaCliente(id),
        listarAbonos(id),
      ])
      if (!vigente || epocaDetalle.current !== marca) return
      if (!clienteResultado.ok) {
        if (!guardado) {
          setCliente(null)
          setTotal(null)
          setAbonos([])
          setErrorDetalle({ id, texto: clienteResultado.mensaje })
          setErrorAbonos(null)
        }
        setClaveCargada(clave)
        return
      }

      setCliente(clienteResultado.datos)
      const totalNuevo = canastaResultado.ok ? totalCanasta(canastaResultado.datos) : null
      if (!canastaResultado.ok) {
        if (!guardado) setTotal(null)
        setErrorDetalle({ id, texto: canastaResultado.mensaje })
      } else {
        setTotal(totalNuevo)
        setErrorDetalle(null)
      }
      if (!abonosResultado.ok) {
        if (!guardado) setAbonos([])
        setErrorAbonos({ id, texto: abonosResultado.mensaje })
      } else {
        setAbonos(abonosResultado.datos)
        setErrorAbonos(null)
      }
      if (canastaResultado.ok && abonosResultado.ok && totalNuevo != null) {
        reemplazarCache(claveDetalleAbono(id), {
          cliente: clienteResultado.datos,
          total: totalNuevo,
          abonos: abonosResultado.datos,
        })
      }
      setClaveCargada(clave)
    })()

    return () => {
      vigente = false
    }
  }, [clienteId, claveDetalle, claveCargada])

  function sinAbono(id: string) {
    if (!fechas.datos) return false
    return abonoAtrasado(fechas.datos[id], new Date())
  }

  function mostrar(texto: string, tono: AvisoEstado['tono']) {
    setAviso({ texto, tono })
    subirAlInicio()
  }

  function elegirCliente(id: string) {
    setAviso(null)
    setModo(null)
    setParams({ cliente: id })
  }

  function volverABuscar() {
    setAviso(null)
    setModo(null)
    if (desdeCanasta) {
      navigate('/canasta', { replace: true, state: estadoCanastaAbierta(clienteId) })
      return
    }
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
    epocaDetalle.current += 1
    setRecargaLista((valor) => valor + 1)
    setCliente(resultado.datos)
    setModo(null)
    if (lista.ok) {
      setAbonos(lista.datos)
      setErrorAbonos(null)
      reemplazarCache(claveDetalleAbono(cliente.id), {
        cliente: resultado.datos,
        total,
        abonos: lista.datos,
      })
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
    epocaDetalle.current += 1
    setRecargaLista((valor) => valor + 1)
    setCliente(resultado.datos)
    setModo(null)
    if (lista.ok) {
      setAbonos(lista.datos)
      setErrorAbonos(null)
      if (total != null) {
        reemplazarCache(claveDetalleAbono(cliente.id), {
          cliente: resultado.datos,
          total,
          abonos: lista.datos,
        })
      }
    } else {
      setErrorAbonos({ id: cliente.id, texto: lista.mensaje })
    }
    const reactivo = estabaInactivo && resultado.datos.estado === 'activo'
    mostrar(reactivo ? 'Abono actualizado. El cliente volvió a estar activo.' : 'Abono actualizado.', 'ok')
    return resultado
  }

  const detalleVisible = cliente != null && cliente.id === clienteId
  const detalleListo = detalleVisible && total != null
  const modoVisible = modo?.clienteId === clienteId ? modo : null
  const formularioAbierto = modoVisible != null && detalleVisible
  const textoErrorDetalle = errorDetalle?.id === clienteId ? errorDetalle.texto : null
  const textoErrorAbonos = errorAbonos?.id === clienteId ? errorAbonos.texto : null
  const cargandoDetalleVisible = claveDetalle != null && claveCargada !== claveDetalle && !detalleListo

  const claveVista = formularioAbierto ? 'formulario' : clienteId ? `detalle-${clienteId}` : 'buscar'

  function atrasAbonos() {
    if (formularioAbierto) {
      setModo(null)
      return
    }
    volverABuscar()
  }

  return (
    <Layout
      titulo={nombre}
      subtitulo={subtitulo}
      acento={acento}
      onAtras={clienteId ? atrasAbonos : undefined}
    >
      {aviso ? <Aviso tono={aviso.tono}>{aviso.texto}</Aviso> : null}

      <VistaAnimada vistaKey={claveVista}>
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
          onBuscarYa={() => {}}
          onElegir={(elegido) => elegirCliente(elegido.id)}
          onReintentar={() => setRecargaLista((valor) => valor + 1)}
        />
      ) : null}
      </VistaAnimada>
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
                  <span className="shrink-0 font-display text-2xl uppercase leading-none tracking-wide lg:text-4xl">
                    {cliente.codigo}
                  </span>
                  {cliente.nombre ? <span className="min-w-0 truncate text-sm">{cliente.nombre}</span> : null}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {atrasado ? <CampanaAbono /> : null}
                  <EtiquetaEstado estado={cliente.estado} />
                </span>
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

function DetalleAbono({
  acento,
  cliente,
  total,
  abonos,
  cargando,
  errorDetalle,
  errorAbonos,
  sinAbono,
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
  onReintentar: () => void
  onAgregar: () => void
  onEditar: (abono: Abono) => void
}) {
  const { enLinea } = useConexion()
  const tituloId = useId()

  return (
    <div className="flex flex-col gap-5">
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
            <h2 className="min-w-0 break-words font-display text-3xl uppercase leading-none tracking-wide lg:text-5xl">
              {cliente.codigo}
            </h2>
            <span className="flex shrink-0 items-center gap-2">
              {sinAbono ? <CampanaAbono /> : null}
              <EtiquetaEstado estado={cliente.estado} />
            </span>
          </div>
          {cliente.nombre ? <p className="break-words text-sm">{cliente.nombre}</p> : null}
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
