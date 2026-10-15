import type { CSSProperties } from 'react'
import logoCompleto from '../assets/logo-completo.png'
import logoMarca from '../assets/logo-marca.png'

type Props = {
  className?: string
  acento?: string
  estilo?: CSSProperties
  variante?: 'icono' | 'completo'
}

export function LogoMarca({ className = '', estilo, variante = 'icono' }: Props) {
  const esIcono = variante === 'icono'
  return (
    <img
      src={esIcono ? logoMarca : logoCompleto}
      alt="JM Lozada Fashion House"
      className={esIcono ? `rounded-[28%] object-cover ${className}` : `object-contain ${className}`}
      style={estilo}
      draggable={false}
    />
  )
}
