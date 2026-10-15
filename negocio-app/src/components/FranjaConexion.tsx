import { WifiOff } from 'lucide-react'
import { MENSAJE_FRANJA } from '../lib/conexion.ts'
import { useConexion } from '../context/useConexion.ts'

export function FranjaConexion() {
  const { enLinea } = useConexion()
  if (enLinea) return null

  return (
    <div className="sticky top-0 z-40 bg-aviso pt-[env(safe-area-inset-top)] text-black">
      <p
        id="aviso-sin-conexion"
        role="status"
        className="px-5 py-3 text-center text-sm leading-snug"
      >
        <WifiOff aria-hidden className="mr-2 inline-block align-text-bottom" size={18} strokeWidth={2} />
        {MENSAJE_FRANJA}
      </p>
    </div>
  )
}
