import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { claseToque, toque, transicionToque } from '../lib/movimiento.ts'

const variantes = {
  primario: 'bg-black text-white',
  suave: 'bg-black/5 text-black',
  afirmar: 'bg-afirmar text-black',
  peligro: 'bg-peligro text-black',
  borrar: 'bg-borrar text-black',
} as const

type BotonAccionProps = {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
  variante?: keyof typeof variantes
}

export function BotonAccion({
  children,
  onClick,
  disabled = false,
  type = 'button',
  variante = 'suave',
}: BotonAccionProps) {
  const reducirMovimiento = useReducedMotion()

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileTap={reducirMovimiento || disabled ? undefined : toque}
      transition={transicionToque}
      className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 text-sm ${claseToque} ${variantes[variante]}`}
    >
      {children}
    </motion.button>
  )
}
