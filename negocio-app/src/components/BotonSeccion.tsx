import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import type { Seccion } from '../config/secciones.ts'
import { useTransicion } from '../context/useTransicion.ts'

const Enlace = motion.create(Link)

const toque = { scale: 0.97 }

export function BotonSeccion({ nombre, ruta, acento, icono: Icono }: Seccion) {
  const reducirMovimiento = useReducedMotion()
  const { irA } = useTransicion()

  return (
    <Enlace
      to={ruta}
      onClick={(evento) => {
        if (
          evento.button !== 0 ||
          evento.metaKey ||
          evento.ctrlKey ||
          evento.shiftKey ||
          evento.altKey
        ) {
          return
        }
        evento.preventDefault()
        irA(ruta, acento)
      }}
      whileTap={reducirMovimiento ? undefined : toque}
      transition={{ duration: 0.15 }}
      className="flex min-h-14 w-full touch-manipulation items-center gap-3 rounded-full px-4 shadow-sm [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black lg:min-h-24 lg:gap-5 lg:px-6"
      style={{ backgroundColor: acento }}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/60 lg:size-14">
        <Icono aria-hidden size={22} strokeWidth={2} />
      </span>
      <span className="font-display text-xl uppercase leading-none tracking-wide lg:text-4xl">
        {nombre}
      </span>
    </Enlace>
  )
}
