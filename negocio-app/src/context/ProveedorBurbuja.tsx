import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { DURACION_BURBUJA_MS, type TonoAviso } from '../lib/feedback.ts'
import { claseToque } from '../lib/movimiento.ts'
import { ContextoBurbuja } from './contextoBurbuja.ts'

type Burbuja = { id: number; texto: string; tono: TonoAviso }

export function ProveedorBurbuja({ children }: { children: ReactNode }) {
  const reducirMovimiento = useReducedMotion()
  const [burbuja, setBurbuja] = useState<Burbuja | null>(null)
  const marca = useRef(0)
  const temporizador = useRef<number | null>(null)

  const cerrar = useCallback(() => {
    if (temporizador.current != null) window.clearTimeout(temporizador.current)
    temporizador.current = null
    setBurbuja(null)
  }, [])

  const avisar = useCallback(
    (texto: string, tono: TonoAviso = 'ok') => {
      marca.current += 1
      const id = marca.current
      setBurbuja({ id, texto, tono })
      if (temporizador.current != null) window.clearTimeout(temporizador.current)
      temporizador.current = window.setTimeout(() => {
        setBurbuja((actual) => (actual?.id === id ? null : actual))
      }, DURACION_BURBUJA_MS)
    },
    [],
  )

  useEffect(() => {
    return () => {
      if (temporizador.current != null) window.clearTimeout(temporizador.current)
    }
  }, [])

  const esError = burbuja?.tono === 'error'

  return (
    <ContextoBurbuja.Provider value={{ avisar }}>
      {children}
      {createPortal(
        <AnimatePresence>
          {burbuja ? (
            <motion.div
              key={burbuja.id}
              role="status"
              initial={reducirMovimiento ? false : { opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducirMovimiento ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: reducirMovimiento ? 0 : 0.2 }}
              className={`fixed top-[max(0.75rem,env(safe-area-inset-top))] left-1/2 z-[100] flex max-w-[min(92vw,24rem)] -translate-x-1/2 items-start gap-2 rounded-3xl px-4 py-3 text-sm leading-snug text-black shadow-lg ${esError ? 'bg-peligro' : 'bg-afirmar'}`}
            >
              <p className="min-w-0 flex-1 pt-0.5">{burbuja.texto}</p>
              <button
                type="button"
                aria-label="Cerrar aviso"
                onClick={cerrar}
                className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-black/10 ${claseToque}`}
              >
                <X aria-hidden size={16} strokeWidth={2} />
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}
    </ContextoBurbuja.Provider>
  )
}
