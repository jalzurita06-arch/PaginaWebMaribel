import { useEffect, useState } from 'react'
import { Aviso } from '../components/Aviso.tsx'
import { BotonAccion } from '../components/BotonAccion.tsx'
import { FormularioValor } from '../components/FormularioValor.tsx'
import { IndicadorCarga } from '../components/IndicadorCarga.tsx'
import { Layout } from '../components/Layout.tsx'
import { useConexion } from '../context/useConexion.ts'
import { MENSAJE_FALLO_RED } from '../lib/conexion.ts'
import { TarjetaPrecio } from '../components/TarjetaPrecio.tsx'
import { secciones } from '../config/secciones.ts'
import {
  actualizarPrecio,
  cambiarOrden,
  crearPrecio,
  crearPreciosDeEjemplo,
  eliminarPrecio,
  listarPrecios,
  type Precio,
} from '../services/precios.ts'
import type { DireccionOrden } from '../lib/precios.ts'

type Mensaje = { tipo: 'exito' | 'error'; texto: string }

export function Catalogo() {
  const { nombre, subtitulo, acento } = secciones.catalogo
  const { enLinea } = useConexion()
  const [precios, setPrecios] = useState<Precio[]>([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<Mensaje | null>(null)
  const [agregando, setAgregando] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [creandoEjemplo, setCreandoEjemplo] = useState(false)

  async function cargar() {
    setCargando(true)
    setErrorCarga(null)
    const resultado = await listarPrecios()
    if (!resultado.ok) {
      setErrorCarga(resultado.mensaje)
      setPrecios([])
    } else {
      setErrorCarga(null)
      setPrecios(resultado.datos)
    }
    setCargando(false)
  }

  useEffect(() => {
    let activo = true

    void (async () => {
      const resultado = await listarPrecios()
      if (!activo) return
      if (!resultado.ok) {
        setErrorCarga(resultado.mensaje)
        setPrecios([])
      } else {
        setErrorCarga(null)
        setPrecios(resultado.datos)
      }
      setCargando(false)
    })()

    return () => {
      activo = false
    }
  }, [])

  function limpiarModos() {
    setAgregando(false)
    setEditandoId(null)
    setEliminandoId(null)
  }

  function fallar(texto: string) {
    setMensaje({ tipo: 'error', texto })
  }

  async function agregar(valor: number) {
    if (!enLinea) {
      fallar(MENSAJE_FALLO_RED)
      return
    }
    setOcupado(true)
    setMensaje(null)
    const resultado = await crearPrecio(valor)
    if (!resultado.ok) {
      fallar(resultado.mensaje)
      setOcupado(false)
      return
    }
    const lista = await listarPrecios()
    if (!lista.ok) fallar('El valor se guardó, pero no se pudo actualizar la lista.')
    else {
      setPrecios(lista.datos)
      setMensaje({ tipo: 'exito', texto: 'Valor agregado.' })
      setAgregando(false)
    }
    setOcupado(false)
  }

  async function guardarEdicion(id: string, valor: number) {
    if (!enLinea) {
      fallar(MENSAJE_FALLO_RED)
      return
    }
    setOcupado(true)
    setMensaje(null)
    const resultado = await actualizarPrecio(id, valor)
    if (!resultado.ok) {
      fallar(resultado.mensaje)
      setOcupado(false)
      return
    }
    const lista = await listarPrecios()
    if (!lista.ok) fallar('El valor se actualizó, pero no se pudo actualizar la lista.')
    else {
      setPrecios(lista.datos)
      setMensaje({ tipo: 'exito', texto: 'Valor actualizado.' })
      setEditandoId(null)
    }
    setOcupado(false)
  }

  async function confirmarEliminar(id: string) {
    if (!enLinea) {
      fallar(MENSAJE_FALLO_RED)
      return
    }
    setOcupado(true)
    setMensaje(null)
    const resultado = await eliminarPrecio(id)
    if (!resultado.ok) {
      fallar(resultado.mensaje)
      setOcupado(false)
      return
    }
    const lista = await listarPrecios()
    if (!lista.ok) fallar('El valor se eliminó, pero no se pudo actualizar la lista.')
    else {
      setPrecios(lista.datos)
      setMensaje({ tipo: 'exito', texto: 'Valor eliminado.' })
      setEliminandoId(null)
    }
    setOcupado(false)
  }

  async function mover(id: string, direccion: DireccionOrden) {
    if (!enLinea) {
      fallar(MENSAJE_FALLO_RED)
      return
    }
    setOcupado(true)
    setMensaje(null)
    const resultado = await cambiarOrden(id, direccion)
    if (!resultado.ok) {
      fallar(resultado.mensaje)
      setOcupado(false)
      return
    }
    const lista = await listarPrecios()
    if (!lista.ok) fallar('El orden cambió, pero no se pudo actualizar la lista.')
    else {
      setPrecios(lista.datos)
      setMensaje({ tipo: 'exito', texto: 'Orden actualizado.' })
    }
    setOcupado(false)
  }

  async function crearEjemplo() {
    if (!enLinea) {
      fallar(MENSAJE_FALLO_RED)
      return
    }
    setOcupado(true)
    setCreandoEjemplo(true)
    setAgregando(false)
    setMensaje(null)
    const resultado = await crearPreciosDeEjemplo()
    if (!resultado.ok) fallar(resultado.mensaje)
    else {
      setPrecios(resultado.datos)
      setMensaje({ tipo: 'exito', texto: 'Valores de ejemplo creados.' })
    }
    setCreandoEjemplo(false)
    setOcupado(false)
  }

  const errorServidor = mensaje?.tipo === 'error' ? mensaje.texto : null

  return (
    <Layout titulo={nombre} subtitulo={subtitulo} acento={acento}>
      <section aria-busy={cargando || ocupado} className="flex flex-col gap-4">
        {mensaje?.tipo === 'exito' ? (
          <p role="status" className="rounded-3xl px-5 py-4 text-sm" style={{ backgroundColor: acento }}>
            {mensaje.texto}
          </p>
        ) : null}
        {mensaje?.tipo === 'error' && !agregando && !editandoId && !eliminandoId ? (
          <Aviso>{mensaje.texto}</Aviso>
        ) : null}

        {agregando ? (
          <div className="rounded-3xl bg-white p-5 shadow-sm lg:max-w-xl lg:p-8">
            <FormularioValor
              textoBoton="Agregar valor"
              existentes={precios.map((precio) => precio.valor)}
              ocupado={ocupado}
              errorServidor={errorServidor}
              onCancelar={() => {
                setAgregando(false)
                setMensaje(null)
              }}
              onEscribir={() => setMensaje(null)}
              onGuardar={(valor) => {
                void agregar(valor)
              }}
            />
          </div>
        ) : (
          <div className="lg:max-w-xs">
            <BotonAccion
              variante="primario"
              disabled={cargando || ocupado}
              onClick={() => {
                limpiarModos()
                setMensaje(null)
                setAgregando(true)
              }}
            >
              Agregar valor
            </BotonAccion>
          </div>
        )}

        {cargando ? <IndicadorCarga>Cargando valores…</IndicadorCarga> : null}

        {errorCarga ? (
          <div className="flex flex-col gap-3">
            <Aviso>{errorCarga}</Aviso>
            <BotonAccion variante="primario" disabled={ocupado} onClick={() => void cargar()}>
              Reintentar
            </BotonAccion>
          </div>
        ) : null}

        {!cargando && !errorCarga && precios.length === 0 ? (
          <div className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-base leading-relaxed">
              Todavía no hay valores. La venta usa estos montos para armar la canasta.
            </p>
            <BotonAccion variante="primario" disabled={ocupado || !enLinea} onClick={() => void crearEjemplo()}>
              {creandoEjemplo ? 'Creando valores…' : 'Crear valores de ejemplo'}
            </BotonAccion>
          </div>
        ) : null}

        {precios.length > 0 ? (
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4 xl:grid-cols-3">
            {precios.map((precio, indice) => (
              <li
                key={precio.id}
                className={
                  editandoId === precio.id || eliminandoId === precio.id
                    ? 'lg:col-span-2 xl:col-span-3'
                    : undefined
                }
              >
                <TarjetaPrecio
                  precio={precio}
                  acento={acento}
                  esPrimero={indice === 0}
                  esUltimo={indice === precios.length - 1}
                  ocupado={ocupado}
                  editando={editandoId === precio.id}
                  eliminando={eliminandoId === precio.id}
                  existentes={precios
                    .filter((item) => item.id !== precio.id)
                    .map((item) => item.valor)}
                  errorServidor={
                    editandoId === precio.id || eliminandoId === precio.id ? errorServidor : null
                  }
                  onEditar={() => {
                    setAgregando(false)
                    setEliminandoId(null)
                    setEditandoId(precio.id)
                    setMensaje(null)
                  }}
                  onEliminar={() => {
                    setAgregando(false)
                    setEditandoId(null)
                    setEliminandoId(precio.id)
                    setMensaje(null)
                  }}
                  onCancelar={() => {
                    setEditandoId(null)
                    setEliminandoId(null)
                    setMensaje(null)
                  }}
                  onEscribir={() => setMensaje(null)}
                  onGuardar={(valor) => {
                    void guardarEdicion(precio.id, valor)
                  }}
                  onConfirmarEliminar={() => {
                    void confirmarEliminar(precio.id)
                  }}
                  onSubir={() => {
                    limpiarModos()
                    void mover(precio.id, 'subir')
                  }}
                  onBajar={() => {
                    limpiarModos()
                    void mover(precio.id, 'bajar')
                  }}
                />
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </Layout>
  )
}
