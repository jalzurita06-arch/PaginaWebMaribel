import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { estaEnLinea } from '../lib/conexion.ts'
import { ContextoConexion } from './contextoConexion.ts'

function leerEnLinea(): boolean | undefined {
  if (typeof navigator === 'undefined') return undefined
  return navigator.onLine
}

export function ProveedorConexion({ children }: { children: ReactNode }) {
  const [enLinea, setEnLinea] = useState(() => estaEnLinea(leerEnLinea()))

  useEffect(() => {
    // onLine no avisa solo: online y offline disparan la lectura.
    function sincronizar() {
      setEnLinea(estaEnLinea(leerEnLinea()))
    }

    sincronizar()
    window.addEventListener('online', sincronizar)
    window.addEventListener('offline', sincronizar)
    return () => {
      window.removeEventListener('online', sincronizar)
      window.removeEventListener('offline', sincronizar)
    }
  }, [])

  const valor = useMemo(() => ({ enLinea }), [enLinea])

  return <ContextoConexion.Provider value={valor}>{children}</ContextoConexion.Provider>
}
