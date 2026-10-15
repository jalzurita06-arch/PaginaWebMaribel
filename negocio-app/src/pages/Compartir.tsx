import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Aviso } from '../components/Aviso.tsx'
import { IndicadorCarga } from '../components/IndicadorCarga.tsx'
import { Layout } from '../components/Layout.tsx'
import { negocio } from '../config/negocio.ts'
import { secciones } from '../config/secciones.ts'
import {
  datosBancariosListos,
  esCelular,
  nombreArchivoPedido,
  leerVenta,
  resumenPedido,
  telefonoConPrefijo,
  textoWhatsApp,
  urlWhatsApp,
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
  const textoVenta = parametros.get('venta')
  const { acento } = secciones.canasta
  const reducirMovimiento = useReducedMotion()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [items, setItems] = useState<ItemCanasta[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<AvisoEstado | null>(null)
  const [enlace, setEnlace] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
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

  const resumen = cliente ? resumenPedido(items, cliente.saldo_favor) : null
  const telefono = cliente ? telefonoConPrefijo(cliente.telefono, negocio.telefonoPrefijo) : ''
  const bancoListo = datosBancariosListos(negocio)
  const listo = Boolean(cliente && resumen && !error && !cargando && telefono && bancoListo)

  async function compartir() {
    if (!cliente || ocupado) return
    setAviso(null)
    setEnlace(null)

    if (!bancoListo) {
      setAviso({ tono: 'error', texto: 'Faltan los datos bancarios del negocio. Revísalos antes de compartir.' })
      return
    }
    if (!telefono) {
      setAviso({ tono: 'error', texto: 'Este cliente no tiene un teléfono válido para WhatsApp.' })
      return
    }

    const texto = textoWhatsApp(cliente, negocio)
    const archivo = nombreArchivoPedido(cliente.codigo)
    setOcupado(true)

    try {
      if (detectarCelular()) {
        await compartirEnCelular(cliente.id, telefono, texto, archivo, esVenta ? items : undefined, setAviso, setEnlace)
      } else {
        await compartirEnComputadora(cliente.id, telefono, texto, archivo, esVenta ? items : undefined, setAviso, setEnlace)
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
              Usa el teléfono guardado de este cliente y abre su WhatsApp. En la computadora también copia la imagen
              para pegarla con Ctrl+V. Compartir no cambia ningún dato.
            </p>

            <motion.button
              type="button"
              onClick={() => void compartir()}
              disabled={!listo || ocupado}
              whileTap={reducirMovimiento || !listo || ocupado ? undefined : toque}
              transition={{ duration: 0.15 }}
              className={`${boton} bg-black text-white`}
            >
              {ocupado ? 'Preparando imagen…' : 'Compartir por WhatsApp'}
            </motion.button>

            {enlace ? (
              <a
                href={enlace}
                target="_blank"
                rel="noopener noreferrer"
                className={boton}
                style={{ backgroundColor: acento }}
              >
                Abrir WhatsApp
              </a>
            ) : null}

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

function detectarCelular(): boolean {
  const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean } }
  if (typeof nav.userAgentData?.mobile === 'boolean') return nav.userAgentData.mobile
  return esCelular(nav.userAgent, {
    plataforma: nav.platform,
    puntosTactiles: nav.maxTouchPoints,
  })
}

async function compartirEnCelular(
  clienteId: string,
  telefono: string,
  texto: string,
  archivo: string,
  venta: ItemCanasta[] | undefined,
  setAviso: (aviso: AvisoEstado) => void,
  setEnlace: (url: string | null) => void,
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
  const url = urlWhatsApp('celular', telefono, texto)

  if (admiteArchivo) {
    try {
      await navigator.share({ files: [imagen], text: texto })
    } catch (error) {
      if (esCancelacion(error)) return
    }
  }

  setEnlace(url)
  const abierta = abrirChatCliente(url)
  if (!abierta) {
    setAviso({
      tono: 'error',
      texto: 'No se pudo abrir el WhatsApp de este cliente.',
    })
    return
  }

  setAviso({
    tono: 'ok',
    texto: admiteArchivo
      ? 'Se abrió el WhatsApp de este cliente. Si la imagen no quedó adjunta, envíala desde el menú de compartir.'
      : 'Se abrió el WhatsApp de este cliente con el mensaje.',
  })
}

async function compartirEnComputadora(
  clienteId: string,
  telefono: string,
  texto: string,
  archivo: string,
  venta: ItemCanasta[] | undefined,
  setAviso: (aviso: AvisoEstado) => void,
  setEnlace: (url: string | null) => void,
) {
  const promesaImagen = generarImagen(clienteId, venta)
  const escritura = copiarCuandoEsteLista(promesaImagen)

  let blob: Blob
  try {
    blob = await promesaImagen
  } catch (error) {
    setAviso({ tono: 'error', texto: mensajeDe(error) })
    return
  }

  const chat = urlWhatsApp('celular', telefono, texto)
  setEnlace(chat)
  abrirChatCliente(urlWhatsApp('app', telefono, texto))

  const copiada = await escritura
  if (copiada) {
    setAviso({
      tono: 'ok',
      texto: 'Se abrió el WhatsApp de este cliente. Imagen copiada. Pégala con Ctrl+V',
    })
    return
  }

  const descargo = descargarBlob(blob, archivo)
  if (!descargo) {
    setAviso({ tono: 'error', texto: 'Este navegador no puede copiar ni descargar la imagen.' })
    return
  }

  setAviso({
    tono: 'ok',
    texto: `No se pudo copiar la imagen. Se descargó ${archivo} para que la adjuntes.`,
  })
}

function copiarCuandoEsteLista(promesaImagen: Promise<Blob>): Promise<boolean> {
  if (typeof navigator.clipboard?.write !== 'function' || typeof ClipboardItem === 'undefined') {
    return Promise.resolve(false)
  }

  try {
    return navigator.clipboard
      .write([new ClipboardItem({ 'image/png': promesaImagen })])
      .then(() => true)
      .catch(() => false)
  } catch {
    return Promise.resolve(false)
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

function abrirChatCliente(url: string): boolean {
  try {
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.rel = 'noopener noreferrer'
    document.body.appendChild(enlace)
    enlace.click()
    enlace.remove()
    return true
  } catch {
    return false
  }
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
