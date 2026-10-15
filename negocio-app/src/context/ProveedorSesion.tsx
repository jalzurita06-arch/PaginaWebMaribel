import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/auth-js'
import { escucharSesion } from '../services/sesion.ts'
import { ContextoSesion } from './contextoSesion.ts'

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Session | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(
    () =>
      escucharSesion((siguiente) => {
        setSesion(siguiente)
        setCargando(false)
      }),
    [],
  )

  const valor = useMemo(() => ({ sesion, cargando }), [sesion, cargando])

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>
}
