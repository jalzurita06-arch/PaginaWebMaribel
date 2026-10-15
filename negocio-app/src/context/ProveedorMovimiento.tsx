import { MotionConfig } from 'framer-motion'
import { useEffect, useState, type ReactNode } from 'react'
import { aplicarAnimaciones } from '../lib/dispositivo.ts'

export function ProveedorMovimiento({ children }: { children: ReactNode }) {
  const [permitir, setPermitir] = useState(() => aplicarAnimaciones())

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const alCambiar = () => setPermitir(aplicarAnimaciones())
    alCambiar()
    media.addEventListener('change', alCambiar)
    return () => media.removeEventListener('change', alCambiar)
  }, [])

  return <MotionConfig reducedMotion={permitir ? 'user' : 'always'}>{children}</MotionConfig>
}
