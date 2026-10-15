import {
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
} as const satisfies Record<string, Seccion>

export const menuInicio: Seccion[] = [
  secciones.venta,
  secciones.canasta,
  secciones.clientes,
  secciones.catalogo,
  secciones.abonos,
]
