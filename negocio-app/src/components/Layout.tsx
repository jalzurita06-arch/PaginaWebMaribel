import { useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { destinoVolver, estadoCanastaAbierta, vieneDeCanasta } from '../lib/navegacion.ts'
import { cerrarSesion } from '../services/sesion.ts'
import { Aviso } from './Aviso.tsx'
import { LogoMarca } from './LogoMarca.tsx'
import { MenuNavegacion } from './MenuNavegacion.tsx'

const Enlace = motion.create(Link)

type LayoutProps = {
  titulo: string
  subtitulo: string
  acento: string
  onAtras?: () => void
  children?: ReactNode
}

const toque = { scale: 0.97 }

export function Layout({ titulo, subtitulo, acento, onAtras, children }: LayoutProps) {
  const { pathname } = useLocation()
  const reducirMovimiento = useReducedMotion()
  const esInicio = pathname === '/'
  const mostrarVolver = pathname !== '/' && pathname !== '/login'
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [saliendo, setSaliendo] = useState(false)

  async function salir() {
    setSaliendo(true)
    setMensaje(null)
    const resultado = await cerrarSesion()
    if (!resultado.ok) {
      setMensaje(resultado.mensaje)
      setSaliendo(false)
    }
  }

  return (
    <main className="min-h-dvh bg-fondo px-4 py-4 text-black lg:px-10 lg:py-10">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 lg:max-w-6xl lg:gap-8">
        <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 lg:gap-x-8 lg:gap-y-4">
          <div className="col-start-1 row-start-1">
            {pathname === '/login' ? (
              <LogoMarca acento={acento} className="size-12 shrink-0 drop-shadow-sm lg:size-20" />
            ) : mostrarVolver ? (
              <BotonVolver reducirMovimiento={reducirMovimiento} onAtras={onAtras} />
            ) : (
              <MenuNavegacion acento={acento} />
            )}
          </div>
          {esInicio ? (
            <motion.button
              type="button"
              onClick={salir}
              disabled={saliendo}
              whileTap={reducirMovimiento || saliendo ? undefined : toque}
              transition={{ duration: 0.15 }}
              className="col-start-3 row-start-1 inline-flex min-h-11 shrink-0 justify-self-end touch-manipulation items-center rounded-full bg-black/5 px-3 text-sm [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50 lg:px-5"
            >
              {saliendo ? 'Cerrando sesión…' : 'Cerrar sesión'}
            </motion.button>
          ) : mostrarVolver ? (
            <div className="col-start-3 row-start-1 justify-self-end">
              <MenuNavegacion acento={acento} />
            </div>
          ) : null}
          <div
            className={
              mostrarVolver
                ? 'col-span-3 min-w-0 lg:col-span-1 lg:col-start-2 lg:row-start-1'
                : 'col-start-2 row-start-1 min-w-0'
            }
          >
            <h1
              className={
                mostrarVolver
                  ? 'font-display text-[1.75rem] uppercase leading-none tracking-wide lg:text-6xl'
                  : 'font-display text-[1.85rem] uppercase leading-none tracking-wide lg:text-7xl'
              }
            >
              {titulo}
            </h1>
            <p className="mt-0.5 font-sans text-[0.65rem] font-medium uppercase tracking-[0.22em] text-black/60 lg:mt-2 lg:text-sm lg:tracking-[0.28em]">
              {subtitulo}
            </p>
          </div>
        </header>
        {mensaje ? <Aviso>{mensaje}</Aviso> : null}
        {children}
      </div>
    </main>
  )
}

function BotonVolver({
  reducirMovimiento,
  onAtras,
}: {
  reducirMovimiento: boolean | null
  onAtras?: () => void
}) {
  const { pathname } = useLocation()
  const [busqueda] = useSearchParams()
  const desdeCanasta = vieneDeCanasta(pathname, busqueda)
  const clase =
    'inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-full bg-black/5 px-3 text-sm [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black lg:px-4'

  if (onAtras) {
    return (
      <motion.button
        type="button"
        onClick={onAtras}
        whileTap={reducirMovimiento ? undefined : toque}
        transition={{ duration: 0.15 }}
        className={clase}
      >
        <ArrowLeft aria-hidden size={18} strokeWidth={2} />
        Volver
      </motion.button>
    )
  }

  return (
    <Enlace
      to={destinoVolver(pathname, busqueda)}
      replace={desdeCanasta}
      state={desdeCanasta ? estadoCanastaAbierta(busqueda.get('cliente')) : undefined}
      whileTap={reducirMovimiento ? undefined : toque}
      transition={{ duration: 0.15 }}
      className={clase}
    >
      <ArrowLeft aria-hidden size={18} strokeWidth={2} />
      Volver
    </Enlace>
  )
}
