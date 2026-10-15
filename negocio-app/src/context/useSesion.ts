import { useContext } from 'react'
import { ContextoSesion, type EstadoSesion } from './contextoSesion.ts'

export function useSesion(): EstadoSesion {
  const valor = useContext(ContextoSesion)
  if (!valor) {
    throw new Error('useSesion debe usarse dentro de ProveedorSesion')
  }
  return valor
}
