import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

const toque = { scale: 0.97 }

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
      transition={{ duration: 0.15 }}
      className={`inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-full px-4 text-sm [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50 ${variantes[variante]}`}
    >
      {children}
    </motion.button>
  )
}
