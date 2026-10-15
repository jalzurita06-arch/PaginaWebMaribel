import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import type { Seccion } from '../config/secciones.ts'

const Enlace = motion.create(Link)

const toque = { scale: 0.97 }

export function BotonSeccion({ nombre, ruta, acento, icono: Icono }: Seccion) {
  const reducirMovimiento = useReducedMotion()

  return (
    <Enlace
      to={ruta}
      whileTap={reducirMovimiento ? undefined : toque}
      transition={{ duration: 0.15 }}
      className="flex min-h-[4.5rem] w-full touch-manipulation items-center gap-4 rounded-full px-5 shadow-sm [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black lg:min-h-24 lg:gap-5 lg:px-6"
      style={{ backgroundColor: acento }}
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white/60 lg:size-14">
        <Icono aria-hidden size={26} strokeWidth={2} />
      </span>
      <span className="font-display text-3xl uppercase leading-none tracking-wide lg:text-4xl">
        {nombre}
      </span>
    </Enlace>
  )
}
