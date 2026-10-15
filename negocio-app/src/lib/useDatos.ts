import { useEffect, useRef, useState } from 'react'
import { leerCache, pedirDatos, type ResultadoLectura } from './cacheLectura.ts'

/**
 * Muestra lo último guardado al instante y, en segundo plano, pide la versión nueva.
 * El indicador de carga solo aparece cuando todavía no hay nada que mostrar.
 */
export function useDatos<T>(
  clave: string,
  cargar: () => Promise<ResultadoLectura<T>>,
  recarga = 0,
  activo = true,
) {
  const [datos, setDatos] = useState<T | null>(() => leerCache<T>(clave))
  const [esperando, setEsperando] = useState(() => activo && leerCache<T>(clave) == null)
  const [error, setError] = useState<string | null>(null)
  const cargarRef = useRef(cargar)
  cargarRef.current = cargar

  useEffect(() => {
    if (!activo) return
    let vivo = true
    const guardado = leerCache<T>(clave)
    if (guardado != null) {
      setDatos(guardado)
      setEsperando(false)
    } else {
      setEsperando(true)
    }

    void pedirDatos(clave, () => cargarRef.current(), { fresco: recarga > 0 }).then((resultado) => {
      if (!vivo) return
      setEsperando(false)
      if (!resultado.ok) {
        if (leerCache<T>(clave) == null) {
          setDatos(null)
          setError(resultado.mensaje)
        }
        return
      }
      setDatos(resultado.datos)
      setError(null)
    })

    return () => {
      vivo = false
    }
  }, [activo, clave, recarga])

  return { datos, esperando, error }
}
