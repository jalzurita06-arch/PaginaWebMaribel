import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { WifiOff } from 'lucide-react'
import { MENSAJE_FRANJA } from '../lib/conexion.ts'
import { useConexion } from '../context/useConexion.ts'
import { transicionDesplegar } from './PanelDesplegable.tsx'

export function FranjaConexion() {
  const { enLinea } = useConexion()
  const salto = useReducedMotion() === true

  return (
    <AnimatePresence>
      {enLinea ? null : (
        <motion.div
          key="sin-conexion"
          initial={salto ? false : { opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={salto ? { opacity: 0 } : { opacity: 0, height: 0 }}
          transition={salto ? { duration: 0 } : transicionDesplegar}
          className="sticky top-0 z-40 overflow-hidden bg-aviso pt-[env(safe-area-inset-top)] text-black"
        >
          <p id="aviso-sin-conexion" role="status" className="px-5 py-3 text-center text-sm leading-snug">
            <WifiOff aria-hidden className="mr-2 inline-block align-text-bottom" size={18} strokeWidth={2} />
            {MENSAJE_FRANJA}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
