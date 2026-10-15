import { createContext } from 'react'

export type EstadoConexion = {
  enLinea: boolean
}

export const ContextoConexion = createContext<EstadoConexion | null>(null)
