import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

export const transicionDesplegar = { duration: 0.28, ease: [0.22, 1, 0.36, 1] } as const

export function VistaAnimada({
  vistaKey,
  children,
  className,
}: {
  vistaKey: string
  children: ReactNode
  className?: string
}) {
  const salto = useReducedMotion() === true

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={vistaKey}
        initial={salto ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={salto ? { opacity: 0 } : { opacity: 0, y: -16 }}
        transition={salto ? { duration: 0 } : transicionDesplegar}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

export function PanelDesplegable({
  abierto,
  id,
  children,
  className = '',
}: {
  abierto: boolean
  id?: string
  children: ReactNode
  className?: string
}) {
  const salto = useReducedMotion() === true
  const transicion = salto ? { duration: 0 } : transicionDesplegar

  return (
    <AnimatePresence initial={false}>
      {abierto ? (
        <motion.div
          id={id}
          key="panel"
          initial={salto ? false : { height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={transicion}
          className={`overflow-hidden ${className}`.trim()}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export function FilaTablaDesplegable({
  abierto,
  colSpan,
  children,
}: {
  abierto: boolean
  colSpan: number
  children: ReactNode
}) {
  const salto = useReducedMotion() === true
  const transicion = salto ? { duration: 0 } : transicionDesplegar

  return (
    <AnimatePresence initial={false}>
      {abierto ? (
        <motion.tr
          key="detalle"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 1 }}
          transition={transicion}
          className="border-b border-black/10 bg-fondo"
          style={{ display: 'table-row' }}
        >
          <td colSpan={colSpan} className="overflow-hidden align-top" style={{ padding: 0 }}>
            <motion.div
              initial={salto ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={transicion}
              className="overflow-hidden"
            >
              {children}
            </motion.div>
          </td>
        </motion.tr>
      ) : null}
    </AnimatePresence>
  )
}
