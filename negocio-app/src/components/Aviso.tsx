import { motion, useReducedMotion } from 'framer-motion'
import { transicionDesplegar } from './PanelDesplegable.tsx'

export function Aviso({
  children,
  tono = 'error',
}: {
  children: string
  tono?: 'error' | 'ok'
}) {
  const esError = tono === 'error'
  const salto = useReducedMotion() === true

  return (
    <motion.p
      role={esError ? 'alert' : 'status'}
      initial={salto ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={salto ? { opacity: 0 } : { opacity: 0, y: -6 }}
      transition={salto ? { duration: 0 } : transicionDesplegar}
      className={`rounded-3xl px-5 py-4 text-sm leading-relaxed text-black ${esError ? 'bg-peligro' : 'bg-afirmar'}`}
    >
      {children}
    </motion.p>
  )
}
