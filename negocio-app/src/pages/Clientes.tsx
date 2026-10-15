import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { PanelDesplegable, transicionDesplegar, VistaAnimada } from '../components/PanelDesplegable.tsx'
import { Plus } from 'lucide-react'
import { Aviso } from '../components/Aviso.tsx'
import { DetalleCliente } from '../components/DetalleCliente.tsx'
import { EtiquetaEstado } from '../components/EtiquetaEstado.tsx'
import { FormularioAbono } from '../components/FormularioAbono.tsx'
import { FormularioCliente } from '../components/FormularioCliente.tsx'
import { IndicadorCarga } from '../components/IndicadorCarga.tsx'
import { Layout } from '../components/Layout.tsx'
import { secciones } from '../config/secciones.ts'
import { useConexion } from '../context/useConexion.ts'
import { CLAVE_CLIENTES, reemplazarCache } from '../lib/cacheLectura.ts'
import { coincideCliente } from '../lib/busqueda.ts'
import { MENSAJE_FALLO_RED } from '../lib/conexion.ts'
import { subirAlInicio } from '../lib/dispositivo.ts'
import { useDatos } from '../lib/useDatos.ts'
import type { DatosEdicionCliente, DatosNuevoCliente } from '../lib/clienteFormulario.ts'
import { formatearDolares } from '../lib/dinero.ts'
import { excedenteAbono, mensajeAbonoRegistrado, ordenarPorCanasta, totalCanasta } from '../lib/reglas.ts'
import {
  actualizarCliente,
  agregarAbono,
  cambiarEstadoCliente,
  crearCliente,
  eliminarCliente,
  listarCanastaCliente,
  listarClientes,
  obtenerCliente,
  type Cliente,
  type ClienteVenta,
  type EstadoCliente,
  type PrendaCanasta,
  type Resultado,
} from '../services/clientes.ts'

type AvisoEstado = { texto: string; tono: 'ok' | 'error' }

type Vista =
  | { nombre: 'lista' }
  | { nombre: 'crear' }
  | { nombre: 'detalle'; cliente: Cliente }
  | { nombre: 'editar'; cliente: Cliente }
  | { nombre: 'abonar'; cliente: Cliente }
  | {
      nombre: 'confirmar'
      cliente: Cliente
      prendas: PrendaCanasta[] | null
      origen: 'lista' | 'detalle'
      motivo: 'eliminar' | 'bloquear'
    }

const toque = { scale: 0.97 }
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

export function Clientes() {
  const { nombre, subtitulo, acento } = secciones.clientes
  const { enLinea } = useConexion()
  const esPc = usePantallaPc()
  const reducirMovimiento = useReducedMotion()
  const idBusqueda = useId()
  const [busqueda, setBusqueda] = useState('')
  const [recarga, setRecarga] = useState(0)
  const lista = useDatos(CLAVE_CLIENTES, () => listarClientes(), recarga)
  const [parche, setParche] = useState<ClienteVenta[] | null>(null)
  const consulta = busqueda.trim()
  const origen = parche ?? lista.datos ?? []
  const clientes = useMemo(
    () => origen.filter((cliente) => coincideCliente(consulta, cliente.codigo, cliente.nombre)),
    [consulta, origen],
  )
  const cargandoLista = lista.esperando && clientes.length === 0
  const [aviso, setAviso] = useState<AvisoEstado | null>(null)
  const [vista, setVista] = useState<Vista>({ nombre: 'lista' })
  const [ocupado, setOcupado] = useState(false)
  const [cambiandoId, setCambiandoId] = useState<string | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const accion = useRef(false)

  useEffect(() => {
    setParche(null)
  }, [lista.datos])

  function listaLocal(): ClienteVenta[] {
    return parche ?? lista.datos ?? []
  }

  function publicarLista(siguiente: ClienteVenta[]) {
    const ordenada = ordenarPorCanasta(siguiente)
    reemplazarCache(CLAVE_CLIENTES, ordenada)
    setParche(ordenada)
    setRecarga((valor) => valor + 1)
  }

  function anotarCliente(cliente: Cliente) {
    publicarLista(
      listaLocal().map((item) => (item.id === cliente.id ? { ...item, ...cliente } : item)),
    )
  }

  useEffect(() => {
    if (!lista.error) {
      setAviso((actual) => (actual?.tono === 'error' ? null : actual))
      return
    }
    setAviso({ texto: lista.error, tono: 'error' })
  }, [lista.error])

  function mostrar(texto: string, tono: AvisoEstado['tono']) {
    setAviso({ texto, tono })
    subirAlInicio()
  }

  function volverALista() {
    setOcupado(false)
    setVista({ nombre: 'lista' })
  }

  function volverAtras() {
    if (vista.nombre === 'editar' || vista.nombre === 'abonar') {
      setVista({ nombre: 'detalle', cliente: vista.cliente })
      return
    }
    if (vista.nombre === 'confirmar' && vista.origen === 'detalle') {
      setVista({ nombre: 'detalle', cliente: vista.cliente })
      return
    }
    volverALista()
  }

  async function abrirDetalle(cliente: Cliente) {
    setMenuId(null)
    setAviso(null)
    setVista({ nombre: 'detalle', cliente })
    const resultado = await obtenerCliente(cliente.id)
    if (!resultado.ok) {
      mostrar(resultado.mensaje, 'error')
      return
    }
    setVista((actual) =>
      actual.nombre === 'detalle' && actual.cliente.id === cliente.id
        ? { nombre: 'detalle', cliente: resultado.datos }
        : actual,
    )
  }

  async function guardarNuevo(datos: DatosNuevoCliente): Promise<Resultado<Cliente>> {
    setOcupado(true)
    const resultado = await crearCliente(datos)
    setOcupado(false)
    if (!resultado.ok) return resultado

    setVista({ nombre: 'lista' })
    publicarLista([...listaLocal(), { ...resultado.datos, prendas: 0 }])
    mostrar(
      datos.abonoInicial == null
        ? 'Cliente agregado.'
        : 'Cliente agregado. El abono inicial quedó en su saldo a favor.',
      'ok',
    )
    return resultado
  }

  async function guardarEdicion(datos: DatosEdicionCliente): Promise<Resultado<Cliente>> {
    if (vista.nombre !== 'editar') {
      return { ok: false, mensaje: 'No se pudo guardar el cliente. Inténtalo de nuevo.' }
    }

    setOcupado(true)
    const resultado = await actualizarCliente(vista.cliente.id, datos)
    setOcupado(false)
    if (!resultado.ok) return resultado

    setVista({ nombre: 'detalle', cliente: resultado.datos })
    anotarCliente(resultado.datos)
    mostrar('Cliente actualizado.', 'ok')
    return resultado
  }

  async function elegirEstado(cliente: Cliente, estado: EstadoCliente) {
    setMenuId(null)
    if (!enLinea) {
      mostrar(MENSAJE_FALLO_RED, 'error')
      return
    }
    if (accion.current || cliente.estado === estado) return
    accion.current = true
    setCambiandoId(cliente.id)
    setOcupado(true)
    const resultado = await cambiarEstadoCliente(cliente.id, estado)
    accion.current = false
    setCambiandoId(null)
    setOcupado(false)
    if (!resultado.ok) {
      mostrar(resultado.mensaje, 'error')
      return
    }
    anotarCliente(resultado.datos)
    setVista((actual) => {
      if (
        (actual.nombre === 'detalle' || actual.nombre === 'editar' || actual.nombre === 'confirmar') &&
        actual.cliente.id === resultado.datos.id
      ) {
        return { ...actual, cliente: resultado.datos }
      }
      return actual
    })
    mostrar(
      resultado.datos.estado === 'activo'
        ? `${resultado.datos.codigo} ahora está activo.`
        : `${resultado.datos.codigo} ahora está inactivo.`,
      'ok',
    )
  }

  async function prepararBorrado(
    cliente: Cliente,
    origen: 'lista' | 'detalle',
    motivo: 'eliminar' | 'bloquear',
  ) {
    if (!enLinea) {
      mostrar(MENSAJE_FALLO_RED, 'error')
      return
    }
    if (accion.current) return
    accion.current = true
    setMenuId(null)
    setAviso(null)
    setVista({ nombre: 'confirmar', cliente, prendas: null, origen, motivo })
    const resultado = await listarCanastaCliente(cliente.id)
    accion.current = false
    if (!resultado.ok) {
      setVista((actual) =>
        actual.nombre === 'confirmar' && actual.cliente.id === cliente.id
          ? origen === 'lista'
            ? { nombre: 'lista' }
            : { nombre: 'detalle', cliente }
          : actual,
      )
      mostrar(resultado.mensaje, 'error')
      return
    }
    setVista((actual) =>
      actual.nombre === 'confirmar' && actual.cliente.id === cliente.id
        ? { nombre: 'confirmar', cliente, prendas: resultado.datos, origen, motivo }
        : actual,
    )
  }

  async function guardarAbono(monto: number, fecha: string): Promise<Resultado<Cliente>> {
    if (vista.nombre !== 'abonar') {
      return { ok: false, mensaje: 'No se pudo registrar el abono. Inténtalo de nuevo.' }
    }

    const estabaInactivo = vista.cliente.estado === 'inactivo'
    const saldoAntes = vista.cliente.saldo_favor
    setOcupado(true)
    const [resultado, canasta] = await Promise.all([
      agregarAbono(vista.cliente.id, monto, fecha),
      listarCanastaCliente(vista.cliente.id),
    ])
    setOcupado(false)
    if (!resultado.ok) return resultado

    anotarCliente(resultado.datos)
    setVista({ nombre: 'lista' })
    const reactivo = estabaInactivo && resultado.datos.estado === 'activo'
    const excedente = canasta.ok ? excedenteAbono(totalCanasta(canasta.datos), saldoAntes, monto) : 0
    if (excedente > 0) {
      mostrar(mensajeAbonoRegistrado(excedente, reactivo), 'ok')
      return resultado
    }
    const saldo = `Abono agregado. El saldo a favor de ${resultado.datos.codigo} quedó en ${formatearDolares(resultado.datos.saldo_favor)}.`
    mostrar(reactivo ? `${saldo} El cliente volvió a estar activo.` : saldo, 'ok')
    return resultado
  }

  async function confirmarEliminar() {
    if (accion.current || vista.nombre !== 'confirmar' || vista.prendas == null) return
    if (!enLinea) {
      mostrar(MENSAJE_FALLO_RED, 'error')
      return
    }
    accion.current = true
    setOcupado(true)
    const resultado = await eliminarCliente(vista.cliente.id)
    accion.current = false
    setOcupado(false)
    if (!resultado.ok) {
      mostrar(resultado.mensaje, 'error')
      return
    }
    setVista({ nombre: 'lista' })
    publicarLista(listaLocal().filter((item) => item.id !== vista.cliente.id))
    mostrar(vista.motivo === 'bloquear' ? 'Cliente bloqueado.' : 'Cliente eliminado.', 'ok')
  }

  function buscarAhora(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
  }

  const sinResultados = !cargandoLista && clientes.length === 0 && aviso?.tono !== 'error'

  return (
    <Layout
      titulo={nombre}
      subtitulo={subtitulo}
      acento={acento}
      onAtras={vista.nombre !== 'lista' ? volverAtras : undefined}
    >
      {aviso ? <Aviso tono={aviso.tono}>{aviso.texto}</Aviso> : null}

      <VistaAnimada vistaKey={vista.nombre === 'confirmar' ? 'detalle' : vista.nombre}>
      {vista.nombre === 'lista' ? (
        <>
        <div className="flex flex-col gap-4 pb-24">
          <form onSubmit={buscarAhora} className="flex flex-col gap-2">
            <label className="text-sm" htmlFor={idBusqueda}>
              Buscar
            </label>
            <input
              id={idBusqueda}
              type="search"
              enterKeyHint="search"
              value={busqueda}
              placeholder="Código o nombre"
              onChange={(evento) => setBusqueda(evento.target.value)}
              className="rounded-full bg-white px-5 py-4 text-base shadow-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            />
          </form>

          {cargandoLista ? <IndicadorCarga>Cargando clientes…</IndicadorCarga> : null}

          {aviso?.tono === 'error' && clientes.length === 0 ? (
            <button
              type="button"
              onClick={() => setRecarga((valor) => valor + 1)}
              className="min-h-12 rounded-full bg-black px-5 py-3 text-base text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              Reintentar
            </button>
          ) : null}

          {sinResultados ? (
            <p className={esPc ? 'text-base' : 'rounded-3xl bg-white px-5 py-8 text-center shadow-sm'}>
              {consulta ? 'Ningún cliente coincide con la búsqueda.' : 'Aún no hay clientes'}
            </p>
          ) : null}

          {clientes.length > 0 && esPc ? (
            <TablaClientes
              clientes={clientes}
              acento={acento}
              menuId={menuId}
              cambiandoId={cambiandoId}
              enLinea={enLinea}
              onAbrirDetalle={(cliente) => void abrirDetalle(cliente)}
              onAlternarMenu={(id) => setMenuId(menuId === id ? null : id)}
              onElegirEstado={(cliente, estado) => void elegirEstado(cliente, estado)}
              onBloquear={(cliente) => void prepararBorrado(cliente, 'lista', 'bloquear')}
              onAbonar={(cliente) => {
                setMenuId(null)
                setAviso(null)
                setVista({ nombre: 'abonar', cliente })
              }}
            />
          ) : null}

          {clientes.length > 0 && !esPc ? (
          <ul className="flex flex-col gap-3">
            {clientes.map((cliente) => (
              <li
                key={cliente.id}
                className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                <motion.button
                  type="button"
                  onClick={() => void abrirDetalle(cliente)}
                  whileTap={reducirMovimiento ? undefined : toque}
                  transition={{ duration: 0.15 }}
                  className="min-w-0 flex-1 touch-manipulation text-left [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                >
                  <span className="block break-words font-display text-2xl uppercase leading-none tracking-wide lg:text-4xl">
                    {cliente.codigo}
                  </span>
                  {cliente.nombre ? (
                    <span className="mt-2 block break-words text-sm">{cliente.nombre}</span>
                  ) : null}
                  <span className="mt-3 block text-sm text-black/60">Saldo a favor</span>
                  <span className="text-lg">{formatearDolares(cliente.saldo_favor)}</span>
                </motion.button>
                <div className="flex w-36 shrink-0 flex-col gap-2">
                  <button
                    type="button"
                    disabled={cambiandoId !== null}
                    aria-expanded={menuId === cliente.id}
                    aria-controls={`estado-${cliente.id}`}
                    aria-label={`Estado de ${cliente.codigo}`}
                    onClick={() => setMenuId(menuId === cliente.id ? null : cliente.id)}
                    className="w-full rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50"
                  >
                    {cambiandoId === cliente.id ? (
                      <span className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-black/5 px-3 text-sm">
                        Guardando…
                      </span>
                    ) : (
                      <EtiquetaEstado estado={cliente.estado} className="w-full justify-center" />
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={!enLinea}
                    onClick={() => {
                      setMenuId(null)
                      setAviso(null)
                      setVista({ nombre: 'abonar', cliente })
                    }}
                    className="min-h-11 rounded-full bg-black/5 px-3 text-sm leading-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50"
                  >
                    Agregar abono
                  </button>
                </div>
                </div>
                <PanelDesplegable abierto={menuId === cliente.id}>
                  <div
                    id={`estado-${cliente.id}`}
                    role="group"
                    aria-label={`Elige el estado de ${cliente.codigo}`}
                    className="flex flex-col gap-2"
                  >
                    <button
                      type="button"
                      disabled={!enLinea}
                      aria-pressed={cliente.estado === 'activo'}
                      onClick={() => void elegirEstado(cliente, 'activo')}
                      className="min-h-12 rounded-full bg-afirmar px-5 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50"
                    >
                      Activo
                    </button>
                    <button
                      type="button"
                      disabled={!enLinea}
                      aria-pressed={cliente.estado === 'inactivo'}
                      onClick={() => void elegirEstado(cliente, 'inactivo')}
                      className="min-h-12 rounded-full bg-peligro px-5 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50"
                    >
                      Inactivo
                    </button>
                    <button
                      type="button"
                      disabled={!enLinea}
                      onClick={() => void prepararBorrado(cliente, 'lista', 'bloquear')}
                      className="min-h-12 rounded-full bg-borrar px-5 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50"
                    >
                      Bloqueado
                    </button>
                  </div>
                </PanelDesplegable>
              </li>
            ))}
          </ul>
          ) : null}
        </div>
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:px-10">
          <div className="mx-auto flex w-full max-w-lg justify-end lg:max-w-6xl">
            <motion.button
              type="button"
              onClick={() => {
                setAviso(null)
                setVista({ nombre: 'crear' })
              }}
              whileTap={reducirMovimiento ? undefined : toque}
              transition={{ duration: 0.15 }}
              className="pointer-events-auto inline-flex min-h-12 touch-manipulation items-center gap-2 rounded-full bg-black px-5 text-base text-white shadow-sm [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              <Plus aria-hidden size={18} strokeWidth={2} />
              Agregar cliente
            </motion.button>
          </div>
        </div>
        </>
      ) : null}

      {vista.nombre === 'crear' ? (
        <FormularioCliente
          modo="crear"
          guardando={ocupado}
          acento={acento}
          onCancelar={volverALista}
          onCrear={guardarNuevo}
          onEditar={guardarEdicion}
        />
      ) : null}

      {vista.nombre === 'editar' ? (
        <FormularioCliente
          modo="editar"
          cliente={vista.cliente}
          guardando={ocupado}
          acento={acento}
          onCancelar={() => {
            setVista({ nombre: 'detalle', cliente: vista.cliente })
          }}
          onCrear={guardarNuevo}
          onEditar={guardarEdicion}
        />
      ) : null}

      {vista.nombre === 'abonar' ? (
        <FormularioAbono
          cliente={vista.cliente}
          acento={acento}
          guardando={ocupado}
          onCancelar={volverALista}
          onGuardar={guardarAbono}
        />
      ) : null}

      {vista.nombre === 'detalle' || vista.nombre === 'confirmar' ? (
        <DetalleCliente
          cliente={vista.cliente}
          acento={acento}
          ocupado={ocupado}
          confirmacion={vista.nombre === 'confirmar' ? vista : null}
          onEditar={() => {
            if (vista.nombre !== 'detalle') return
            setAviso(null)
            setVista({ nombre: 'editar', cliente: vista.cliente })
          }}
          onCambiarEstado={() => {
            if (vista.nombre !== 'detalle') return
            const siguiente = vista.cliente.estado === 'activo' ? 'inactivo' : 'activo'
            void elegirEstado(vista.cliente, siguiente)
          }}
          onPedirEliminar={() => {
            if (vista.nombre !== 'detalle') return
            void prepararBorrado(vista.cliente, 'detalle', 'eliminar')
          }}
          onConfirmarEliminar={() => void confirmarEliminar()}
          onCancelarEliminar={() => {
            if (vista.nombre !== 'confirmar') return
            if (vista.origen === 'lista') setVista({ nombre: 'lista' })
            else setVista({ nombre: 'detalle', cliente: vista.cliente })
          }}
        />
      ) : null}
      </VistaAnimada>
    </Layout>
  )
}

function TablaClientes({
  clientes,
  acento,
  menuId,
  cambiandoId,
  enLinea,
  onAbrirDetalle,
  onAlternarMenu,
  onElegirEstado,
  onBloquear,
  onAbonar,
}: {
  clientes: Cliente[]
  acento: string
  menuId: string | null
  cambiandoId: string | null
  enLinea: boolean
  onAbrirDetalle: (cliente: Cliente) => void
  onAlternarMenu: (id: string) => void
  onElegirEstado: (cliente: Cliente, estado: EstadoCliente) => void
  onBloquear: (cliente: Cliente) => void
  onAbonar: (cliente: Cliente) => void
}) {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-left lg:[&_td]:px-5 lg:[&_td]:py-4 lg:[&_th]:px-5 lg:[&_th]:py-4">
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
                Teléfono
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Saldo a favor
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Estado
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((cliente) => (
              <FilasCliente
                key={cliente.id}
                cliente={cliente}
                menuAbierto={menuId === cliente.id}
                guardando={cambiandoId === cliente.id}
                menuBloqueado={cambiandoId !== null}
                enLinea={enLinea}
                onAbrirDetalle={() => onAbrirDetalle(cliente)}
                onAlternarMenu={() => onAlternarMenu(cliente.id)}
                onElegirEstado={(estado) => onElegirEstado(cliente, estado)}
                onBloquear={() => onBloquear(cliente)}
                onAbonar={() => onAbonar(cliente)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FilasCliente({
  cliente,
  menuAbierto,
  guardando,
  menuBloqueado,
  enLinea,
  onAbrirDetalle,
  onAlternarMenu,
  onElegirEstado,
  onBloquear,
  onAbonar,
}: {
  cliente: Cliente
  menuAbierto: boolean
  guardando: boolean
  menuBloqueado: boolean
  enLinea: boolean
  onAbrirDetalle: () => void
  onAlternarMenu: () => void
  onElegirEstado: (estado: EstadoCliente) => void
  onBloquear: () => void
  onAbonar: () => void
}) {
  const menuPanelId = `estado-${cliente.id}`
  const refEstado = useRef<HTMLButtonElement>(null)
  const refMenu = useRef<HTMLDivElement>(null)
  const reducirMovimiento = useReducedMotion()
  const salto = reducirMovimiento === true

  useLayoutEffect(() => {
    if (!menuAbierto) return

    function colocar() {
      const boton = refEstado.current
      const menu = refMenu.current
      if (!boton || !menu) return
      const origen = boton.getBoundingClientRect()
      const caja = menu.getBoundingClientRect()
      let top = origen.top - caja.height - 8
      if (top < 8) top = origen.bottom + 8
      let left = origen.left + origen.width / 2 - caja.width / 2
      left = Math.min(Math.max(8, left), window.innerWidth - caja.width - 8)
      menu.style.top = `${top}px`
      menu.style.left = `${left}px`
      menu.style.visibility = 'visible'
    }

    colocar()
    window.addEventListener('resize', colocar)
    window.addEventListener('scroll', colocar, true)
    return () => {
      window.removeEventListener('resize', colocar)
      window.removeEventListener('scroll', colocar, true)
    }
  }, [menuAbierto])

  useEffect(() => {
    if (!menuAbierto) return
    refMenu.current?.querySelector('button')?.focus()
  }, [menuAbierto])

  useEffect(() => {
    if (!menuAbierto) return

    function cerrar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onAlternarMenu()
    }
    function clicFuera(evento: PointerEvent) {
      const destino = evento.target
      if (!(destino instanceof Node)) return
      if (refEstado.current?.contains(destino) || refMenu.current?.contains(destino)) return
      onAlternarMenu()
    }
    window.addEventListener('keydown', cerrar)
    window.addEventListener('pointerdown', clicFuera)
    return () => {
      window.removeEventListener('keydown', cerrar)
      window.removeEventListener('pointerdown', clicFuera)
    }
  }, [menuAbierto, onAlternarMenu])

  function abrirSiEsDato(evento: MouseEvent<HTMLTableRowElement>) {
    const destino = evento.target
    if (!(destino instanceof Element)) return
    if (destino.closest('a, button')) return
    onAbrirDetalle()
  }

  return (
    <>
      <tr
        className={`border-b border-black/10 align-top ${menuAbierto ? 'bg-black/[0.03]' : 'hover:bg-black/[0.03]'}`}
        onClick={abrirSiEsDato}
      >
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={onAbrirDetalle}
            className="break-words text-left font-display text-2xl uppercase leading-none tracking-wide focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            {cliente.codigo}
          </button>
        </td>
        <td className="px-4 py-3">{cliente.nombre ?? 'Sin nombre'}</td>
        <td className="px-4 py-3">
          <a
            href={`tel:${cliente.telefono}`}
            className="underline decoration-black/30 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            {cliente.telefono}
          </a>
        </td>
        <td className="px-4 py-3 text-right tabular-nums">{formatearDolares(cliente.saldo_favor)}</td>
        <td className="px-4 py-3">
          <button
            ref={refEstado}
            type="button"
            disabled={menuBloqueado}
            aria-expanded={menuAbierto}
            aria-controls={menuPanelId}
            aria-label={`Estado de ${cliente.codigo}`}
            onClick={onAlternarMenu}
            className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50"
          >
            {guardando ? (
              <span className="inline-flex min-h-11 items-center justify-center rounded-full bg-black/5 px-4 text-sm">
                Guardando…
              </span>
            ) : (
              <EtiquetaEstado estado={cliente.estado} />
            )}
          </button>
        </td>
        <td className="px-4 py-3 text-right">
          <button
            type="button"
            disabled={!enLinea}
            onClick={onAbonar}
            className="inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-full bg-black/5 px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50"
          >
            Agregar abono
          </button>
        </td>
      </tr>
      {menuAbierto
        ? createPortal(
            <motion.div
              ref={refMenu}
              id={menuPanelId}
              role="group"
              aria-label={`Elige el estado de ${cliente.codigo}`}
              initial={salto ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={salto ? { duration: 0 } : transicionDesplegar}
              className="fixed z-30 flex w-40 flex-col gap-2 rounded-3xl bg-white p-3 shadow-md"
              style={{ top: 0, left: 0, visibility: 'hidden' }}
            >
              <button
                type="button"
                disabled={!enLinea}
                aria-pressed={cliente.estado === 'activo'}
                onClick={() => onElegirEstado('activo')}
                className="min-h-11 rounded-full bg-afirmar px-5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50"
              >
                Activo
              </button>
              <button
                type="button"
                disabled={!enLinea}
                aria-pressed={cliente.estado === 'inactivo'}
                onClick={() => onElegirEstado('inactivo')}
                className="min-h-11 rounded-full bg-peligro px-5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50"
              >
                Inactivo
              </button>
              <button
                type="button"
                disabled={!enLinea}
                onClick={onBloquear}
                className="min-h-11 rounded-full bg-borrar px-5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50"
              >
                Bloqueado
              </button>
            </motion.div>,
            document.body,
          )
        : null}
    </>
  )
}
