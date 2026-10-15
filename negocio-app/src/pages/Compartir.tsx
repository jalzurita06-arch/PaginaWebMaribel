import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Aviso } from '../components/Aviso.tsx'
import { IndicadorCarga } from '../components/IndicadorCarga.tsx'
import { Layout } from '../components/Layout.tsx'
import { negocio } from '../config/negocio.ts'
import { secciones } from '../config/secciones.ts'
import {
  abrirWhatsAppDeCliente,
  datosBancariosListos,
  datosParaCompartir,
  detectarCelular,
  MENSAJE_VENTANA_BLOQUEADA,
  nombreArchivoPedido,
  leerVenta,
  resumenPedido,
  telefonoConPrefijo,
  textoWhatsApp,
} from '../lib/compartir.ts'
import { claveCanastaCliente, leerCache, pedirDatos } from '../lib/cacheLectura.ts'
import { formatearDolares } from '../lib/dinero.ts'
import { generarImagen, prepararArchivoCompartir } from '../lib/generarImagen.tsx'
import type { ItemCanasta } from '../lib/reglas.ts'
import { obtenerCanasta } from '../services/canasta.ts'
import { obtenerCliente, type Cliente } from '../services/clientes.ts'

const boton =
  'inline-flex min-h-12 w-full touch-manipulation items-center justify-center rounded-full px-5 py-3 text-base [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50'

const toque = { scale: 0.97 }
const Enlace = motion.create(Link)

type AvisoEstado = { texto: string; tono: 'ok' | 'error' }

export function Compartir() {
  const { clienteId = '' } = useParams()
  const [parametros] = useSearchParams()
  const textoVenta = parametros.get('venta')
  const { acento } = secciones.canasta
  const reducirMovimiento = useReducedMotion()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [items, setItems] = useState<ItemCanasta[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<AvisoEstado | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [imagenLista, setImagenLista] = useState<Blob | null>(null)
  const [archivoCelular, setArchivoCelular] = useState<File | null>(null)
  const [imagenFallida, setImagenFallida] = useState(false)
  const [intento, setIntento] = useState(0)
  const esVenta = textoVenta != null

  useEffect(() => {
    let vigente = true
    const clave = claveCanastaCliente(clienteId)
    const guardada = textoVenta == null ? leerCache<ItemCanasta[]>(clave) : null
    if (guardada) setItems(guardada)
    if (!guardada) setCargando(true)

    void (async () => {
      if (textoVenta != null) {
        const resultadoCliente = await obtenerCliente(clienteId)
        if (!vigente) return
        if (!resultadoCliente.ok) {
          setCliente(null)
          setItems([])
          setError(resultadoCliente.mensaje)
          setCargando(false)
          return
        }
        const venta = leerVenta(textoVenta)
        setCliente(resultadoCliente.datos)
        if (!venta) {
          setItems([])
          setError('No se pudo leer esta venta.')
          setCargando(false)
          return
        }
        setItems(venta)
        setError(null)
        setCargando(false)
        return
      }

      const [resultadoCliente, resultadoCanasta] = await Promise.all([
        obtenerCliente(clienteId),
        pedirDatos(clave, () => obtenerCanasta(clienteId), { fresco: true }),
      ])
      if (!vigente) return
      if (!resultadoCliente.ok) {
        setCliente(null)
        if (!guardada) setItems([])
        setError(resultadoCliente.mensaje)
        setCargando(false)
        return
      }
      setCliente(resultadoCliente.datos)
      if (!resultadoCanasta.ok) {
        if (!guardada) {
          setItems([])
          setError(resultadoCanasta.mensaje)
        }
        setCargando(false)
        return
      }
      setItems(resultadoCanasta.datos)
      setError(null)
      setCargando(false)
    })()
    return () => {
      vigente = false
    }
  }, [clienteId, intento, textoVenta])

  useEffect(() => {
    if (!cliente || error || cargando) {
      setImagenLista(null)
      setArchivoCelular(null)
      setImagenFallida(false)
      return
    }

    let vigente = true
    setImagenLista(null)
    setArchivoCelular(null)
    setImagenFallida(false)
    const nombre = nombreArchivoPedido(cliente.codigo)
    void generarImagen(cliente.id, esVenta ? items : undefined)
      .then(async (blob) => {
        if (!vigente) return
        setImagenLista(blob)
        const archivo = await prepararArchivoCompartir(blob, nombre)
        if (vigente) setArchivoCelular(archivo)
      })
      .catch(() => {
        if (vigente) {
          setImagenLista(null)
          setArchivoCelular(null)
          setImagenFallida(true)
        }
      })

    return () => {
      vigente = false
    }
  }, [cliente, items, esVenta, error, cargando, intento])

  const resumen = cliente ? resumenPedido(items, cliente.saldo_favor) : null
  const telefono = cliente ? telefonoConPrefijo(cliente.telefono, negocio.telefonoPrefijo) : ''
  const bancoListo = datosBancariosListos(negocio)
  const enCelular = detectarCelular()
  const imagenPreparada = enCelular ? archivoCelular != null : imagenLista != null
  const preparandoImagen = Boolean(
    cliente && resumen && !error && !cargando && !imagenPreparada && !imagenFallida,
  )
  const listo = Boolean(cliente && resumen && !error && !cargando && telefono && bancoListo && !imagenFallida)

  async function compartir() {
    if (!cliente || ocupado) return
    setAviso(null)

    if (!bancoListo) {
      setAviso({ tono: 'error', texto: 'Faltan los datos bancarios del negocio. Revísalos antes de compartir.' })
      return
    }
    if (!telefono) {
      setAviso({ tono: 'error', texto: 'Este cliente no tiene un teléfono válido para WhatsApp.' })
      return
    }

    const archivo = nombreArchivoPedido(cliente.codigo)
    const venta = esVenta ? items : undefined
    setOcupado(true)

    try {
      if (enCelular) {
        // El menú de compartir tiene que abrirse en este mismo toque, con imagen y texto ya listos.
        await compartirEnCelular(
          archivoCelular,
          textoWhatsApp(cliente, negocio),
          () => abrirWhatsAppDeCliente(cliente, negocio, negocio.telefonoPrefijo),
          setAviso,
        )
        return
      }

      // En PC se copia la imagen con esta pestaña al frente. El chat se abre después.
      const resultado = await compartirEnComputadora(cliente.id, archivo, venta, imagenLista, setAviso)
      if (!resultado.ok) return

      const chat = abrirWhatsAppDeCliente(cliente, negocio, negocio.telefonoPrefijo)
      if (chat.bloqueada) {
        setAviso({
          tono: 'error',
          texto: resultado.copiada
            ? `${MENSAJE_VENTANA_BLOQUEADA}. La imagen ya está copiada: pégala con Ctrl+V cuando abras WhatsApp.`
            : MENSAJE_VENTANA_BLOQUEADA,
        })
      }
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Layout titulo="Compartir" subtitulo={esVenta ? 'Esta venta' : 'Canasta completa'} acento={acento}>
      {error ? <Aviso>{error}</Aviso> : null}
      {aviso ? <Aviso tono={aviso.tono}>{aviso.texto}</Aviso> : null}
      {cargando && !cliente ? <IndicadorCarga>Cargando cliente…</IndicadorCarga> : null}
      {!cargando && error && textoVenta == null ? (
        <button type="button" onClick={() => setIntento((valor) => valor + 1)} className={`${boton} bg-black text-white`}>
          Reintentar
        </button>
      ) : null}
      {cliente && resumen && !error ? (
        <section className="flex flex-col gap-5 rounded-3xl bg-white p-5 shadow-sm lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 lg:p-8">
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="break-words font-display text-3xl uppercase leading-none tracking-wide lg:text-5xl">
                {cliente.codigo}
              </h2>
              {cliente.nombre ? <p className="mt-2 break-words text-sm">{cliente.nombre}</p> : null}
              <p className="mt-3 break-words text-sm text-black/60">Teléfono {cliente.telefono}</p>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-base">{esVenta ? 'Esta venta' : 'Prendas'}</h3>
              {resumen.grupos.length === 0 ? (
                <p role="status" className="rounded-3xl bg-fondo px-5 py-8 text-center">
                  {esVenta ? 'Esta venta no tiene prendas.' : 'La canasta no tiene prendas.'}
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {resumen.grupos.map((grupo) => (
                    <li key={grupo.precio} className="flex items-baseline justify-between gap-3">
                      <span>
                        {formatearDolares(grupo.precio)} × {grupo.cantidad}
                      </span>
                      <span className="tabular-nums">{formatearDolares(grupo.subtotal)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <dl className="grid grid-cols-3 gap-2">
              <Monto etiqueta="Abono" valor={resumen.abono} />
              <Monto etiqueta="Saldo" valor={resumen.saldo} />
              <Monto etiqueta="Total" valor={resumen.total} />
            </dl>

            {!telefono ? (
              <Aviso>Este cliente no tiene un teléfono válido para WhatsApp.</Aviso>
            ) : null}
            {!bancoListo ? (
              <Aviso>Faltan los datos bancarios del negocio. Revísalos antes de compartir.</Aviso>
            ) : null}
            {imagenFallida ? <Aviso>No se pudo crear la imagen del pedido.</Aviso> : null}

            <p className="text-sm leading-relaxed text-black/60">
              {enCelular
                ? 'Se abre el menú del celular con la imagen y el mensaje listos. Tú eliges cómo compartirlos. Compartir no cambia ningún dato.'
                : 'Primero se copia la imagen y después se abre el chat del cliente con el mensaje listo. Pégala con Ctrl+V. Compartir no cambia ningún dato.'}
            </p>

            {imagenFallida ? (
              <button type="button" onClick={() => setIntento((valor) => valor + 1)} className={`${boton} bg-black text-white`}>
                Reintentar
              </button>
            ) : (
              <motion.button
                type="button"
                onClick={() => void compartir()}
                disabled={!listo || ocupado || preparandoImagen}
                whileTap={reducirMovimiento || !listo || ocupado || preparandoImagen ? undefined : toque}
                transition={{ duration: 0.15 }}
                className={`${boton} bg-black text-white`}
              >
                {ocupado || preparandoImagen ? 'Preparando imagen…' : 'Compartir por WhatsApp'}
              </motion.button>
            )}

            <Enlace
              to="/"
              whileTap={reducirMovimiento ? undefined : toque}
              transition={{ duration: 0.15 }}
              className={`${boton} bg-black/5`}
            >
              Salir
            </Enlace>
          </div>
        </section>
      ) : null}
    </Layout>
  )
}

function Monto({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div>
      <dt className="text-sm text-black/60">{etiqueta}</dt>
      <dd className="text-base tabular-nums">{formatearDolares(valor)}</dd>
    </div>
  )
}

async function compartirEnCelular(
  archivo: File | null,
  texto: string,
  abrirChat: () => { bloqueada: boolean },
  setAviso: (aviso: AvisoEstado) => void,
) {
  if (!archivo) {
    setAviso({ tono: 'error', texto: 'No se pudo crear la imagen del pedido.' })
    return
  }

  const datos =
    typeof navigator.share === 'function' ? datosParaCompartir(archivo, texto, puedeCompartirDatos) : null

  if (datos) {
    try {
      await navigator.share(datos)
      setAviso({ tono: 'ok', texto: 'La imagen y el mensaje quedaron listos en la aplicación que elegiste.' })
      return
    } catch (error) {
      if (esCancelacion(error)) return
      if (datos.text) {
        const soloArchivo = datosParaCompartir(
          archivo,
          texto,
          (dato) => dato.text == null && puedeCompartirDatos(dato),
        )
        if (soloArchivo) {
          try {
            await navigator.share(soloArchivo)
            setAviso({ tono: 'ok', texto: 'La imagen se adjuntó en la aplicación que elegiste.' })
            return
          } catch (errorReintento) {
            if (esCancelacion(errorReintento)) return
          }
        }
      }
    }
  }

  const descargo = descargarBlob(archivo, archivo.name)
  const chat = abrirChat()
  if (!descargo) {
    setAviso({
      tono: 'error',
      texto: chat.bloqueada ? MENSAJE_VENTANA_BLOQUEADA : 'No se pudo adjuntar ni descargar la imagen.',
    })
    return
  }

  setAviso({
    tono: chat.bloqueada ? 'error' : 'ok',
    texto: chat.bloqueada
      ? `${MENSAJE_VENTANA_BLOQUEADA}. La imagen se descargó: adjúntala cuando abras WhatsApp.`
      : `Se descargó ${archivo.name} y se abrió el chat. Adjúntala con el clip de WhatsApp.`,
  })
}

async function compartirEnComputadora(
  clienteId: string,
  archivo: string,
  venta: ItemCanasta[] | undefined,
  imagenLista: Blob | null,
  setAviso: (aviso: AvisoEstado) => void,
): Promise<{ ok: boolean; copiada: boolean }> {
  let blob: Blob
  try {
    blob = imagenLista ?? (await generarImagen(clienteId, venta))
  } catch (error) {
    setAviso({ tono: 'error', texto: mensajeDe(error) })
    return { ok: false, copiada: false }
  }

  const copiada = await copiarImagen(blob)
  if (copiada) {
    setAviso({
      tono: 'ok',
      texto: 'Imagen copiada. Se abre WhatsApp. Pégala con Ctrl+V',
    })
    return { ok: true, copiada: true }
  }

  const descargo = descargarBlob(blob, archivo)
  if (!descargo) {
    setAviso({ tono: 'error', texto: 'Este navegador no puede copiar ni descargar la imagen.' })
    return { ok: false, copiada: false }
  }

  setAviso({
    tono: 'ok',
    texto: `No se pudo copiar la imagen. Se descargó ${archivo} para que la adjuntes.`,
  })
  return { ok: true, copiada: false }
}

async function copiarImagen(blob: Blob): Promise<boolean> {
  if (typeof navigator.clipboard?.write !== 'function' || typeof ClipboardItem === 'undefined') {
    return false
  }

  const png = blob.type === 'image/png' ? blob : new Blob([blob], { type: 'image/png' })
  try {
    window.focus()
  } catch {
    // Si no se puede devolver el foco, igual se intenta copiar.
  }

  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
    return true
  } catch {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': Promise.resolve(png) })])
      return true
    } catch {
      return false
    }
  }
}

function puedeCompartirDatos(datos: ShareData): boolean {
  if (typeof navigator.canShare !== 'function') {
    return datos.text == null && Array.isArray(datos.files) && datos.files.length > 0
  }
  try {
    return navigator.canShare(datos)
  } catch {
    return false
  }
}

function esCancelacion(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'
}

function descargarBlob(blob: Blob, nombre: string): boolean {
  try {
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = nombre
    document.body.appendChild(enlace)
    enlace.click()
    enlace.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1500)
    return true
  } catch {
    return false
  }
}

function mensajeDe(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'No se pudo crear la imagen del pedido.'
}
