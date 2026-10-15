import { useContext } from 'react'
import { ContextoTransicion, type EstadoTransicion } from './contextoTransicion.ts'

export function useTransicion(): EstadoTransicion {
  const valor = useContext(ContextoTransicion)
  if (!valor) {
    throw new Error('useTransicion debe usarse dentro de ProveedorTransicion')
  }
  return valor
}
