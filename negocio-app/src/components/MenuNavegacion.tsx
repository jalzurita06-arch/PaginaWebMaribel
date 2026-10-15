import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { House } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { acentoInicio, menuInicio, type Seccion } from '../config/secciones.ts'
import { LogoMarca } from './LogoMarca.tsx'

const Enlace = motion.create(Link)
const toque = { scale: 0.97 }
const consultaPc = '(min-width: 1024px)'

const inicio: Seccion = {
  nombre: 'Inicio',
  ruta: '/',
  acento: acentoInicio,
  icono: House,
  subtitulo: 'Menú principal',
}

const destinos: Seccion[] = [inicio, ...menuInicio]

export function MenuNavegacion({ acento }: { acento: string }) {
  const { pathname } = useLocation()
  const reducirMovimiento = useReducedMotion()
  const menuId = useId()
  const refBoton = useRef<HTMLButtonElement>(null)
  const refPanel = useRef<HTMLDivElement>(null)
  const yaEnfocado = useRef(false)
  const [abierto, setAbierto] = useState(false)
  const [caja, setCaja] = useState<{ top: number; left: number; right: number } | null>(null)
  const [esPc, setEsPc] = useState(() => window.matchMedia(consultaPc).matches)

  useEffect(() => {
    const media = window.matchMedia(consultaPc)
    const alCambiar = () => setEsPc(media.matches)
    media.addEventListener('change', alCambiar)
    return () => media.removeEventListener('change', alCambiar)
  }, [])

  useEffect(() => {
    setAbierto(false)
  }, [pathname])

  useEffect(() => {
    if (!abierto) {
      setCaja(null)
      return
    }

    function ubicar() {
      const boton = refBoton.current?.getBoundingClientRect()
      if (!boton) return
      setCaja({
        top: boton.bottom + 8,
        left: boton.left,
        right: window.innerWidth - boton.right,
      })
    }

    ubicar()
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('resize', ubicar)
    window.addEventListener('scroll', ubicar, true)
    return () => {
      document.body.style.overflow = previo
      window.removeEventListener('resize', ubicar)
      window.removeEventListener('scroll', ubicar, true)
    }
  }, [abierto])

  useEffect(() => {
    if (!abierto) return
    function tecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setAbierto(false)
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [abierto])

  useEffect(() => {
    if (!abierto) {
      yaEnfocado.current = false
      return
    }
    if (esPc && !caja) return
    if (yaEnfocado.current) return
    const destino = refPanel.current?.querySelector('a')
    if (!destino) return
    yaEnfocado.current = true
    destino.focus()
  }, [abierto, caja, esPc])

  useEffect(() => {
    if (!abierto) return
    const boton = refBoton.current
    return () => boton?.focus()
  }, [abierto])

  const ancladoDerecha = caja != null && caja.left > window.innerWidth / 2

  const panel =
    abierto && (esPc ? caja : true)
      ? createPortal(
          <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby={menuId}>
            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setAbierto(false)}
              className="absolute inset-0 bg-black/25 lg:bg-black/10"
            />
            <nav
              ref={refPanel}
              id={menuId}
              aria-label="Secciones"
              className={
                esPc
                  ? 'absolute flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2 rounded-3xl bg-white p-3 shadow-md'
                  : 'absolute inset-x-0 bottom-0 flex max-h-[min(88dvh,40rem)] flex-col gap-2 overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-md'
              }
              style={
                esPc && caja
                  ? {
                      top: caja.top,
                      ...(ancladoDerecha ? { right: caja.right } : { left: Math.max(16, caja.left) }),
                    }
                  : undefined
              }
            >
              <p className="px-2 pb-1 text-sm uppercase tracking-[0.28em] text-black/60">Ir a</p>
              {destinos.map((seccion) => {
                const actual = esRutaActual(pathname, seccion.ruta)
                const Icono = seccion.icono
                return (
                  <Enlace
                    key={seccion.ruta}
                    to={seccion.ruta}
                    aria-current={actual ? 'page' : undefined}
                    onClick={() => setAbierto(false)}
                    whileTap={reducirMovimiento ? undefined : toque}
                    transition={{ duration: 0.15 }}
                    className={`flex min-h-14 w-full touch-manipulation items-center gap-3 rounded-full px-4 [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${actual ? 'ring-2 ring-inset ring-black/40' : ''}`}
                    style={{ backgroundColor: seccion.acento }}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/60">
                      <Icono aria-hidden size={20} strokeWidth={2} />
                    </span>
                    <span className="font-display text-2xl uppercase leading-none tracking-wide">
                      {seccion.nombre}
                    </span>
                  </Enlace>
                )
              })}
            </nav>
          </div>,
          document.body,
        )
      : null

  return (
    <div className="relative shrink-0">
      <motion.button
        ref={refBoton}
        type="button"
        aria-expanded={abierto}
        aria-controls={menuId}
        aria-haspopup="true"
        aria-label="Abrir menú de secciones"
        onClick={() => setAbierto((valor) => !valor)}
        whileTap={reducirMovimiento ? undefined : toque}
        transition={{ duration: 0.15 }}
        className="rounded-3xl [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
      >
        <LogoMarca acento={acento} className="size-16 drop-shadow-sm lg:size-20" />
      </motion.button>
      {panel}
    </div>
  )
}

function esRutaActual(pathname: string, ruta: string): boolean {
  if (ruta === '/') return pathname === '/'
  return pathname === ruta || pathname.startsWith(`${ruta}/`)
}
