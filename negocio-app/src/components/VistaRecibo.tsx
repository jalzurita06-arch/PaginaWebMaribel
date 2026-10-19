import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

const ANCHO_RECIBO = 360

/** Escala el recibo al ancho disponible; el marco encaja al tamaño visible, sin hueco debajo. */
export function VistaRecibo({ children }: { children: ReactNode }) {
  const contenedor = useRef<HTMLDivElement>(null)
  const lamina = useRef<HTMLDivElement>(null)
  const [escala, setEscala] = useState(1)
  const [tamaño, setTamaño] = useState({ ancho: ANCHO_RECIBO, alto: 0 })

  useLayoutEffect(() => {
    const caja = contenedor.current
    const hoja = lamina.current
    if (!caja || !hoja) return

    function medir() {
      if (!caja || !hoja) return
      const ancho = caja.clientWidth
      const siguiente = Math.min(1, ancho > 0 ? ancho / ANCHO_RECIBO : 1)
      hoja.style.transform = `scale(${siguiente})`
      hoja.style.transformOrigin = 'top left'
      const rect = hoja.getBoundingClientRect()
      setEscala(siguiente)
      setTamaño({ ancho: rect.width, alto: rect.height })
    }

    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(caja)
    observador.observe(hoja)
    return () => observador.disconnect()
  }, [children])

  return (
    <div ref={contenedor} className="w-full">
      <div
        className="mx-auto overflow-hidden rounded-3xl bg-white"
        style={{
          width: tamaño.alto > 0 ? tamaño.ancho : ANCHO_RECIBO,
          height: tamaño.alto > 0 ? tamaño.alto : undefined,
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
