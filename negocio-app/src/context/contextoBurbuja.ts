import { createContext } from 'react'
import type { TonoAviso } from '../lib/feedback.ts'

export type EstadoBurbuja = {
  avisar: (texto: string, tono?: TonoAviso) => void
}

export const ContextoBurbuja = createContext<EstadoBurbuja | null>(null)
