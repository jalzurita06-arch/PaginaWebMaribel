import { useContext } from 'react'
import { ContextoBurbuja, type EstadoBurbuja } from './contextoBurbuja.ts'

export function useBurbuja(): EstadoBurbuja['avisar'] {
  const valor = useContext(ContextoBurbuja)
  if (!valor) {
    throw new Error('useBurbuja debe usarse dentro de ProveedorBurbuja')
  }
  return valor.avisar
}
