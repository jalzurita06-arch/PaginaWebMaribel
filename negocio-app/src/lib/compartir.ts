import { redondear2 } from './dinero.ts'
import {
  agruparPorPrecio,
  saldoPendiente,
  totalCanasta,
  type GrupoPrecio,
  type ItemCanasta,
} from './reglas.ts'

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

const SEPARADOR = '━'.repeat(12)

export type DatosBancarios = {
  banco: string
  nombreTitular: string
  tipoCuenta: string
  numeroCuenta: string
  cedula: string
}

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

export function datosBancariosListos(datos: DatosBancarios): boolean {
  return [datos.banco, datos.nombreTitular, datos.tipoCuenta, datos.numeroCuenta, datos.cedula].every(
    (valor) => valor.trim() !== '',
  )
}

export function textoWhatsApp(
  cliente: { nombre: string | null; codigo: string },
  datos: DatosBancarios,
): string {
  const codigo = cliente.codigo.trim()
  const nombre = cliente.nombre?.trim() ?? ''
  const saludo = nombre ? `¡Hola! ${nombre}-${codigo} 🌷💕` : `¡Hola! ${codigo} 🌷💕`

  return [
    saludo,
    'Le hago llegar el detalle de su pedido y el valor pendiente por cancelar. Muchas gracias por su confianza. 🥰',
    SEPARADOR,
    `🏦 *${datos.banco.trim()}*`,
    `👩‍💼 ${datos.nombreTitular.trim()}`,
    `💳 ${datos.tipoCuenta.trim()}`,
    `🔢 ${datos.numeroCuenta.trim()}`,
    `Cédula : ${datos.cedula.trim()}`,
  ].join('\n')
}

export function urlWhatsApp(via: 'celular' | 'web' | 'app', telefono: string, texto: string): string {
  const mensaje = encodeURIComponent(texto)
  if (via === 'app') return `whatsapp://send?phone=${telefono}&text=${mensaje}`
  if (via === 'celular') return `https://wa.me/${telefono}?text=${mensaje}`
  return `https://web.whatsapp.com/send?phone=${telefono}&text=${mensaje}`
}

export function nombreArchivoPedido(codigo: string): string {
  const limpio = codigo.trim().replace(/[^\p{L}\p{N}.-]+/gu, '-')
  return `pedido-${limpio || 'cliente'}.png`
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
