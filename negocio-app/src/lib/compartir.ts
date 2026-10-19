import { redondear2 } from './dinero.ts'
import { datosBancariosListos, textoWhatsApp, type PlantillaCompartir } from './plantilla.ts'
import {
  agruparPorPrecio,
  saldoPendiente,
  totalCanasta,
  type GrupoPrecio,
  type ItemCanasta,
} from './reglas.ts'

export { datosBancariosListos, textoWhatsApp } from './plantilla.ts'
export type { PlantillaCompartir } from './plantilla.ts'

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const

export type ResumenPedido = {
  grupos: GrupoPrecio[]
  total: number
  abono: number
  saldo: number
}

export function formatearFechaRecibo(fecha: Date): string {
  const mes = MESES[fecha.getMonth()] ?? ''
  return `${fecha.getDate()} de ${mes} de ${fecha.getFullYear()}`
}

/** Quita el 0 inicial y antepone el prefijo solo si todavía no está. */
export function telefonoConPrefijo(telefono: string, prefijo: string): string {
  const digitos = telefono.replace(/\D/g, '')
  const sinCero = digitos.startsWith('0') ? digitos.slice(1) : digitos
  const prefijoLimpio = prefijo.replace(/\D/g, '')
  if (!sinCero) return ''
  if (prefijoLimpio && sinCero.startsWith(prefijoLimpio)) return sinCero
  return `${prefijoLimpio}${sinCero}`
}

export function urlWhatsApp(via: 'celular' | 'web' | 'app', telefono: string, texto: string): string {
  const mensaje = encodeURIComponent(texto)
  if (via === 'app') return `whatsapp://send?phone=${telefono}&text=${mensaje}`
  if (via === 'celular') return `https://wa.me/${telefono}?text=${mensaje}`
  return `https://web.whatsapp.com/send?phone=${telefono}&text=${mensaje}`
}

let ventanaWhatsapp: Window | null = null

export const MENSAJE_VENTANA_BLOQUEADA =
  'Permite ventanas emergentes para este sitio en tu navegador'

/** Abre o reutiliza el chat. En PC no hay await: debe llamarse en el mismo clic. */
export function abrirChatWhatsApp(
  telefono: string,
  texto: string,
  celular: boolean,
): { url: string; bloqueada: boolean } {
  if (celular) {
    const app = urlWhatsApp('app', telefono, texto)
    const enlace = document.createElement('a')
    enlace.href = app
    document.body.appendChild(enlace)
    enlace.click()
    enlace.remove()
    return { url: urlWhatsApp('celular', telefono, texto), bloqueada: false }
  }

  const url = urlWhatsApp('web', telefono, texto)
  if (ventanaWhatsapp && !ventanaWhatsapp.closed) {
    try {
      ventanaWhatsapp.location.href = url
      ventanaWhatsapp.focus()
      return { url, bloqueada: false }
    } catch {
      try {
        ventanaWhatsapp.location.assign(url)
        ventanaWhatsapp.focus()
        return { url, bloqueada: false }
      } catch {
        // Si el navegador no deja navegar esa pestaña, se abre otra.
      }
    }
  }

  ventanaWhatsapp = window.open(url, '_blank')
  if (ventanaWhatsapp == null) return { url, bloqueada: true }
  ventanaWhatsapp.focus()
  return { url, bloqueada: false }
}

/** Mismo clic en Venta, Canasta o Compartir: abre o reutiliza el chat. */
export function abrirWhatsAppDeCliente(
  cliente: { nombre: string | null; codigo: string; telefono: string },
  plantilla: PlantillaCompartir,
  prefijo: string,
): { url: string; bloqueada: boolean } {
  const telefono = telefonoConPrefijo(cliente.telefono, prefijo)
  if (!telefono || !datosBancariosListos(plantilla)) return { url: '', bloqueada: false }
  return abrirChatWhatsApp(telefono, textoWhatsApp(cliente, plantilla), detectarCelular())
}

export function nombreArchivoPedido(codigo: string): string {
  const limpio = codigo.trim().replace(/[^\p{L}\p{N}.-]+/gu, '-')
  return `pedido-${limpio || 'cliente'}.png`
}

/**
 * En el celular la imagen solo se adjunta si el menú de compartir la acepta.
 * El mensaje va junto cuando el navegador lo permite; si no, se manda solo el archivo.
 * Un enlace de WhatsApp no puede llevar la imagen.
 */
export function datosParaCompartir(
  archivo: File,
  texto: string,
  puede: (datos: ShareData) => boolean,
): ShareData | null {
  const conTexto: ShareData = { files: [archivo], text: texto }
  const soloArchivo: ShareData = { files: [archivo] }

  if (consultaCompartir(puede, conTexto)) return conTexto
  if (consultaCompartir(puede, soloArchivo)) return soloArchivo
  return null
}

function consultaCompartir(puede: (datos: ShareData) => boolean, datos: ShareData): boolean {
  try {
    return puede(datos)
  } catch {
    return false
  }
}

/** Deja la venta en la ruta para compartir solo esas prendas. */
export function codificarVenta(items: ItemCanasta[]): string {
  return items.map((item) => `${redondear2(item.precio)}x${item.cantidad}`).join(',')
}

/** null si el texto no es una lista de precio x cantidad. */
export function leerVenta(texto: string): ItemCanasta[] | null {
  const partes = texto
    .split(',')
    .map((parte) => parte.trim())
    .filter((parte) => parte !== '')
  if (partes.length === 0) return null

  const items: ItemCanasta[] = []
  for (const parte of partes) {
    const coincidencia = /^(\d+(?:\.\d+)?)x([1-9]\d*)$/.exec(parte)
    if (!coincidencia) return null
    const precio = redondear2(Number(coincidencia[1]))
    const cantidad = Number(coincidencia[2])
    if (!(precio > 0) || !Number.isSafeInteger(cantidad)) return null
    items.push({ precio, cantidad })
  }
  return items
}

/** Agrupa la canasta que se comparte. No modifica los ítems originales. */
export function resumenPedido(items: ItemCanasta[], saldoFavor: number): ResumenPedido {
  const grupos = [...agruparPorPrecio(items)].sort((a, b) => a.precio - b.precio)
  const total = totalCanasta(items)
  const abono = redondear2(Math.max(0, saldoFavor))
  return {
    grupos,
    total,
    abono,
    saldo: saldoPendiente(total, abono),
  }
}

export function esCelular(
  agente: string,
  opciones?: { plataforma?: string; puntosTactiles?: number },
): boolean {
  if (/Android|iPhone|iPad|iPod/i.test(agente)) return true
  return opciones?.plataforma === 'MacIntel' && (opciones.puntosTactiles ?? 0) > 1
}

export function detectarCelular(): boolean {
  if (typeof navigator === 'undefined') return false
  const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean } }
  if (typeof nav.userAgentData?.mobile === 'boolean') return nav.userAgentData.mobile
  return esCelular(nav.userAgent, {
    plataforma: nav.platform,
    puntosTactiles: nav.maxTouchPoints,
  })
}
