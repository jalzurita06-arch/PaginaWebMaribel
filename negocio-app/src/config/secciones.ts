import {
  MessageCircle,
  Shirt,
  ShoppingBasket,
  Tags,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export type Seccion = {
  nombre: string
  ruta: string
  acento: string
  icono: LucideIcon
  subtitulo: string
}

export const acentoInicio = '#E7C8A0'
export const acentoLogin = '#E4D3C4'

export const secciones = {
  venta: {
    nombre: 'Venta',
    ruta: '/venta',
    acento: '#F3C1C1',
    icono: Shirt,
    subtitulo: 'Agregar prendas',
  },
  canasta: {
    nombre: 'Canasta',
    ruta: '/canasta',
    acento: '#F6D7A8',
    icono: ShoppingBasket,
    subtitulo: 'Canastas abiertas',
  },
  clientes: {
    nombre: 'Clientes',
    ruta: '/clientes',
    acento: '#C9D7F2',
    icono: Users,
    subtitulo: 'Agenda',
  },
  catalogo: {
    nombre: 'Catálogo',
    ruta: '/catalogo',
    acento: '#D5E6C8',
    icono: Tags,
    subtitulo: 'Valores de prenda',
  },
  abonos: {
    nombre: 'Abonos',
    ruta: '/abonos',
    acento: '#E3D4F0',
    icono: Wallet,
    subtitulo: 'Saldo a favor',
  },
  mensaje: {
    nombre: 'Mensaje',
    ruta: '/mensaje',
    acento: '#F8D5C4',
    icono: MessageCircle,
    subtitulo: 'WhatsApp y recibo',
  },
} as const satisfies Record<string, Seccion>

export const menuInicio: Seccion[] = [
  secciones.venta,
  secciones.canasta,
  secciones.clientes,
  secciones.catalogo,
  secciones.abonos,
]

export const fichasInicio: Seccion[] = [...menuInicio, secciones.mensaje]

export function claveSeccion(pathname: string): string {
  if (pathname === '/' || pathname === '') return 'inicio'
  if (pathname.startsWith('/venta') || pathname.startsWith('/compartir')) return 'venta'
  if (pathname.startsWith('/canasta')) return 'canasta'
  if (pathname.startsWith('/clientes')) return 'clientes'
  if (pathname.startsWith('/catalogo')) return 'catalogo'
  if (pathname.startsWith('/abonos')) return 'abonos'
  if (pathname.startsWith('/mensaje')) return 'mensaje'
  return pathname
}

export function acentoDeRuta(pathname: string): string {
  const clave = claveSeccion(pathname)
  if (clave === 'inicio') return acentoInicio
  if (clave === 'venta') return secciones.venta.acento
  if (clave === 'canasta') return secciones.canasta.acento
  if (clave === 'clientes') return secciones.clientes.acento
  if (clave === 'catalogo') return secciones.catalogo.acento
  if (clave === 'abonos') return secciones.abonos.acento
  if (clave === 'mensaje') return secciones.mensaje.acento
  return acentoLogin
}

export function mismaSeccion(actual: string, destino: string): boolean {
  return claveSeccion(actual) === claveSeccion(destino)
}
