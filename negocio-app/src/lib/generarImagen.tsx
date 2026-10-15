import { toBlob } from 'html-to-image'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { ResumenImagen } from '../components/ResumenImagen.tsx'
import { obtenerCanasta } from '../services/canasta.ts'
import { obtenerCliente } from '../services/clientes.ts'
import { formatearFechaRecibo, resumenPedido } from './compartir.ts'
import type { ItemCanasta } from './reglas.ts'

/** Lee la canasta, o solo la venta indicada, y arma el PNG. No guarda ni modifica ningún dato. */
export async function generarImagen(clienteId: string, venta?: ItemCanasta[]): Promise<Blob> {
  const cliente = await obtenerCliente(clienteId)
  if (!cliente.ok) throw new Error(cliente.mensaje)

  let items = venta
  if (!items) {
    const canasta = await obtenerCanasta(clienteId)
    if (!canasta.ok) throw new Error(canasta.mensaje)
    items = canasta.datos
  }

  if (typeof document === 'undefined') {
    throw new Error('Este navegador no puede crear la imagen.')
  }

  const resumen = resumenPedido(items, cliente.datos.saldo_favor)
  const contenedor = document.createElement('div')
  contenedor.setAttribute('aria-hidden', 'true')
  contenedor.style.position = 'fixed'
  contenedor.style.left = '0'
  contenedor.style.top = '0'
  contenedor.style.transform = 'translateX(-120vw)'
  contenedor.style.pointerEvents = 'none'
  contenedor.style.zIndex = '-1'
  document.body.appendChild(contenedor)

  const root = createRoot(contenedor)

  try {
    flushSync(() => {
      root.render(
        <ResumenImagen
          codigo={cliente.datos.codigo}
          nombre={cliente.datos.nombre}
          fecha={formatearFechaRecibo(new Date())}
          grupos={resumen.grupos}
          abono={resumen.abono}
          saldo={resumen.saldo}
          total={resumen.total}
          concepto={venta ? 'Esta venta' : undefined}
        />,
      )
    })

    if (document.fonts?.ready) {
      try {
        await document.fonts.ready
      } catch {
        // Si la fuente no termina de cargar, el recibo usa la que ya esté disponible.
      }
    }

    await siguienteFrame()

    const nodo = contenedor.querySelector('article')
    if (!(nodo instanceof HTMLElement) || nodo.clientWidth === 0 || nodo.clientHeight === 0) {
      throw new Error('No se pudo preparar la imagen del pedido.')
    }

    const restaurarEstilos = instalarEstilosCompatibles()
    let blob: Blob | null
    try {
      blob = await toBlob(nodo, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        skipFonts: true,
        width: nodo.scrollWidth,
        height: nodo.scrollHeight,
      })
    } catch {
      throw new Error('No se pudo crear la imagen del pedido.')
    } finally {
      restaurarEstilos()
    }

    if (!blob || blob.size === 0) {
      throw new Error('No se pudo crear la imagen del pedido.')
    }

    return blob.type === 'image/png' ? blob : new Blob([blob], { type: 'image/png' })
  } finally {
    root.unmount()
    contenedor.remove()
  }
}

function siguienteFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

/**
 * html-to-image copia el CSS calculado. Tailwind usa oklch y esa función
 * rompe el PNG, así que esos colores se cambian por negro o blanco.
 */
function instalarEstilosCompatibles(): () => void {
  const original = window.getComputedStyle
  window.getComputedStyle = ((elemento: Element, pseudo?: string | null) => {
    const estilo = pseudo ? original.call(window, elemento, pseudo) : original.call(window, elemento)
    return estiloCompatible(estilo)
  }) as typeof window.getComputedStyle

  return () => {
    window.getComputedStyle = original
  }
}

function estiloCompatible(estilo: CSSStyleDeclaration): CSSStyleDeclaration {
  return new Proxy(estilo, {
    get(objetivo, propiedad) {
      if (propiedad === 'cssText') return ''
      if (propiedad === 'getPropertyValue') {
        return (nombre: string) => valorSeguro(nombre, objetivo.getPropertyValue(nombre))
      }
      const valor: unknown = Reflect.get(objetivo, propiedad, objetivo)
      if (typeof valor === 'function') return (valor as (...argumentos: unknown[]) => unknown).bind(objetivo)
      return valor
    },
  }) as CSSStyleDeclaration
}

function valorSeguro(nombre: string, valor: string): string {
  if (!/oklch|oklab|color-mix|\blch\(|\blab\(/.test(valor)) return valor
  if (nombre.startsWith('background')) return '#ffffff'
  if (nombre.includes('shadow') || nombre === 'filter' || nombre.includes('backdrop')) return 'none'
  if (
    nombre.includes('color') ||
    nombre === 'fill' ||
    nombre === 'stroke' ||
    nombre.includes('border') ||
    nombre.includes('outline') ||
    nombre.includes('text-decoration') ||
    nombre.includes('column-rule')
  ) {
    return '#000000'
  }
  return 'initial'
}
