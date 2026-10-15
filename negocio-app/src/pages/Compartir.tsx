import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Aviso } from '../components/Aviso.tsx'
import { IndicadorCarga } from '../components/IndicadorCarga.tsx'
import { Layout } from '../components/Layout.tsx'
import { negocio } from '../config/negocio.ts'
import { secciones } from '../config/secciones.ts'
import {
  abrirWhatsAppDeCliente,
  datosBancariosListos,
  detectarCelular,
  MENSAJE_VENTANA_BLOQUEADA,
  nombreArchivoPedido,
  leerVenta,
  resumenPedido,
  telefonoConPrefijo,
} from '../lib/compartir.ts'
import { formatearDolares } from '../lib/dinero.ts'
import { generarImagen } from '../lib/generarImagen.tsx'
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
  const ubicacion = useLocation()
  const navigate = useNavigate()
  const textoVenta = parametros.get('venta')
  const desdeConsulta = parametros.get('desde')
  const desdeEstado =
    ubicacion.state && typeof ubicacion.state === 'object' && 'desde' in ubicacion.state
      ? (ubicacion.state as { desde?: unknown }).desde
      : null
  const { acento } = secciones.canasta
  const reducirMovimiento = useReducedMotion()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [items, setItems] = useState<ItemCanasta[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<AvisoEstado | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [imagenLista, setImagenLista] = useState<Blob | null>(null)
  const [imagenFallida, setImagenFallida] = useState(false)
  const [intento, setIntento] = useState(0)
  const esVenta = textoVenta != null

  useEffect(() => {
    let vigente = true
    void (async () => {
      setCargando(true)
      const resultadoCliente = await obtenerCliente(clienteId)
      if (!vigente) return

      if (!resultadoCliente.ok) {
        setCliente(null)
        setItems([])
        setError(resultadoCliente.mensaje)
        setCargando(false)
        return
      }

      setCliente(resultadoCliente.datos)

      if (textoVenta != null) {
        const venta = leerVenta(textoVenta)
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

      const resultadoCanasta = await obtenerCanasta(clienteId)
      if (!vigente) return
      if (!resultadoCanasta.ok) {
        setItems([])
        setError(resultadoCanasta.mensaje)
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
      setImagenFallida(false)
      return
    }

    let vigente = true
    setImagenLista(null)
    setImagenFallida(false)
    void generarImagen(cliente.id, esVenta ? items : undefined)
      .then((blob) => {
        if (vigente) setImagenLista(blob)
      })
      .catch(() => {
        if (vigente) {
          setImagenLista(null)
          setImagenFallida(true)
        }
      })

    return () => {
      vigente = false
    }
  }, [cliente, items, esVenta, error, cargando])

  const resumen = cliente ? resumenPedido(items, cliente.saldo_favor) : null
  const telefono = cliente ? telefonoConPrefijo(cliente.telefono, negocio.telefonoPrefijo) : ''
  const bancoListo = datosBancariosListos(negocio)
  const preparandoImagen = Boolean(
    cliente && resumen && !error && !cargando && !imagenLista && !imagenFallida && !detectarCelular(),
  )
  const listo = Boolean(cliente && resumen && !error && !cargando && telefono && bancoListo)
  const vuelveAVenta = esVenta || desdeConsulta === 'venta' || desdeEstado === 'venta'

  function regresar() {
    navigate(vuelveAVenta ? '/venta' : '/canasta')
  }

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
      if (detectarCelular()) {
        const chat = abrirWhatsAppDeCliente(cliente, negocio, negocio.telefonoPrefijo)
        if (chat.bloqueada) {
          setAviso({ tono: 'error', texto: MENSAJE_VENTANA_BLOQUEADA })
        }
        await compartirEnCelular(cliente.id, archivo, venta, setAviso)
        return
      }

      // En PC la imagen se copia con esta pestaña al frente. WhatsApp se abre después.
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
      <motion.button
        type="button"
        onClick={regresar}
        whileTap={reducirMovimiento ? undefined : toque}
        transition={{ duration: 0.15 }}
        className={`${boton} gap-2 bg-black/5 lg:w-auto lg:self-start lg:px-6`}
      >
        <ArrowLeft aria-hidden size={18} strokeWidth={2} />
        Regresar
      </motion.button>
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
              <h2 className="break-words font-display text-5xl uppercase leading-none tracking-wide">
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

            <p className="text-sm leading-relaxed text-black/60">
              Primero se copia la imagen y después se abre WhatsApp con el mensaje listo. Pégala con Ctrl+V. Compartir no
              cambia ningún dato.
            </p>

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
  clienteId: string,
  archivo: string,
  venta: ItemCanasta[] | undefined,
  setAviso: (aviso: AvisoEstado) => void,
) {
  let blob: Blob
  try {
    blob = await generarImagen(clienteId, venta)
  } catch (error) {
    setAviso({ tono: 'error', texto: mensajeDe(error) })
    return
  }

  const imagen = new File([blob], archivo, { type: 'image/png' })
  const admiteArchivo = puedeCompartirArchivo(imagen)

  if (admiteArchivo) {
    try {
      await navigator.share({ files: [imagen] })
    } catch (error) {
      if (esCancelacion(error)) return
    }
  }

  setAviso({
    tono: 'ok',
    texto: admiteArchivo
      ? 'Se abrió el chat en WhatsApp. Si la imagen no quedó adjunta, envíala desde el menú de compartir.'
      : 'Se abrió el chat en WhatsApp.',
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

function puedeCompartirArchivo(archivo: File): boolean {
  if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false
  try {
    return navigator.canShare({ files: [archivo] })
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
