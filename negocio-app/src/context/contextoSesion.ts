import { createContext } from 'react'
import type { Session } from '@supabase/auth-js'

export type EstadoSesion = {
  sesion: Session | null
  cargando: boolean
}

export const ContextoSesion = createContext<EstadoSesion | null>(null)
