import { createContext } from 'react'

export type EstadoTransicion = {
  irA: (ruta: string, acento: string) => void
}

export const ContextoTransicion = createContext<EstadoTransicion | null>(null)
