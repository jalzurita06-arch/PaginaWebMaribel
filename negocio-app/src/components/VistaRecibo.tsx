import { useEffect, useRef, useState, type ReactNode } from 'react'

const ANCHO_RECIBO = 360

/** Escala el recibo al ancho disponible; el marco mide lo que ocupa, sin hueco debajo. */
export function VistaRecibo({ children }: { children: ReactNode }) {
  const contenedor = useRef<HTMLDivElement>(null)
  const lamina = useRef<HTMLDivElement>(null)
  const [escala, setEscala] = useState(1)
  const [altoNatural, setAltoNatural] = useState(0)

  useEffect(() => {
    const caja = contenedor.current
    const hoja = lamina.current
    if (!caja || !hoja) return

    function medir() {
      if (!caja || !hoja) return
      const ancho = caja.clientWidth
      const natural = hoja.scrollHeight
      setAltoNatural(natural)
      const porAncho = ancho > 0 ? ancho / ANCHO_RECIBO : 1
      setEscala(Math.min(1, porAncho))
    }

    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(caja)
    observador.observe(hoja)
    return () => observador.disconnect()
  }, [children])

  const anchoVisual = ANCHO_RECIBO * escala
  const altoVisual = altoNatural * escala

  return (
    <div ref={contenedor} className="w-full">
      <div
        className="mx-auto overflow-hidden rounded-3xl"
        style={{
          width: anchoVisual > 0 ? anchoVisual : ANCHO_RECIBO,
          height: altoVisual > 0 ? altoVisual : undefined,
        }}
      >
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
    </div>
  )
}
