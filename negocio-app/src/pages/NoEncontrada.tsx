import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout.tsx'
import { acentoInicio } from '../config/secciones.ts'
import { claseToque, toque, transicionToque } from '../lib/movimiento.ts'

const Enlace = motion.create(Link)

export function NoEncontrada() {
  const reducirMovimiento = useReducedMotion()

  return (
    <Layout titulo="No encontrada" subtitulo="Página" acento={acentoInicio}>
      <p className="rounded-3xl bg-white px-5 py-6 text-base leading-relaxed shadow-sm">
        Esa dirección no existe. Vuelve al inicio para seguir con el negocio.
      </p>
      <Enlace
        to="/"
        whileTap={reducirMovimiento ? undefined : toque}
        transition={transicionToque}
        className={`inline-flex min-h-12 w-full items-center justify-center rounded-full bg-black px-5 py-3 text-base text-white ${claseToque}`}
      >
        Ir al inicio
      </Enlace>
    </Layout>
  )
}
