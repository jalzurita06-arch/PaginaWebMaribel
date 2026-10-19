import { useEffect, useRef, useState, type ReactNode } from 'react'

const ANCHO_RECIBO = 360

/** Escala el recibo al recuadro para que se vea completo, sin barras de desplazamiento. */
export function VistaRecibo({ children }: { children: ReactNode }) {
  const marco = useRef<HTMLDivElement>(null)
  const lamina = useRef<HTMLDivElement>(null)
  const [escala, setEscala] = useState(1)

  useEffect(() => {
    const caja = marco.current
    const hoja = lamina.current
    if (!caja || !hoja) return

    function medir() {
      if (!caja || !hoja) return
      const ancho = caja.clientWidth
      const tope = caja.clientHeight
      const natural = hoja.scrollHeight
      const porAncho = ancho > 0 ? ancho / ANCHO_RECIBO : 1
      const porAlto = tope > 40 && natural > 0 ? tope / natural : 1
      setEscala(Math.min(1, porAncho, porAlto))
    }

    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(caja)
    observador.observe(hoja)
    return () => observador.disconnect()
  }, [children])

  return (
    <div ref={marco} className="absolute inset-0 overflow-hidden rounded-3xl bg-fondo">
      <div
        ref={lamina}
        style={{
          width: ANCHO_RECIBO,
          transform: `scale(${escala})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  )
}
