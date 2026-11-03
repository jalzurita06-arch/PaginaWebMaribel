import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ContextoBurbuja } from './contextoBurbuja.ts'

const DURACION = 2600

export function ProveedorBurbuja({ children }: { children: ReactNode }) {
  const reducirMovimiento = useReducedMotion()
  const [burbuja, setBurbuja] = useState<{ id: number; texto: string } | null>(null)
  const marca = useRef(0)
  const temporizador = useRef<number | null>(null)

  const avisar = useCallback((texto: string) => {
    marca.current += 1
    const id = marca.current
    setBurbuja({ id, texto })
    if (temporizador.current != null) window.clearTimeout(temporizador.current)
    temporizador.current = window.setTimeout(() => {
      setBurbuja((actual) => (actual?.id === id ? null : actual))
    }, DURACION)
  }, [])

  useEffect(() => {
    return () => {
      if (temporizador.current != null) window.clearTimeout(temporizador.current)
    }
  }, [])

  return (
    <ContextoBurbuja.Provider value={{ avisar }}>
      {children}
      {createPortal(
        <AnimatePresence>
          {burbuja ? (
            <motion.p
              key={burbuja.id}
              role="status"
              initial={reducirMovimiento ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducirMovimiento ? undefined : { opacity: 0, y: 8 }}
              transition={{ duration: reducirMovimiento ? 0 : 0.18 }}
              className="pointer-events-none fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-[70] max-w-[min(90vw,22rem)] -translate-x-1/2 rounded-full bg-afirmar px-4 py-2.5 text-center text-sm leading-snug text-black shadow-md"
            >
              {burbuja.texto}
            </motion.p>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}
    </ContextoBurbuja.Provider>
  )
}
