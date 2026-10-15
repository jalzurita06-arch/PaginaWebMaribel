import { useContext } from 'react'
import { ContextoConexion, type EstadoConexion } from './contextoConexion.ts'

export function useConexion(): EstadoConexion {
  const valor = useContext(ContextoConexion)
  if (!valor) {
    throw new Error('useConexion debe usarse dentro de ProveedorConexion')
  }
  return valor
}
