import { createContext } from 'react'

export type EstadoBurbuja = {
  avisar: (texto: string) => void
}

export const ContextoBurbuja = createContext<EstadoBurbuja | null>(null)
