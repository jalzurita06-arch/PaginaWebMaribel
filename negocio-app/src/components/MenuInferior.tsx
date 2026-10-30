import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'framer-motion'
import { transicionDesplegar } from './PanelDesplegable.tsx'

export function MenuInferior({
  abierto,
  etiqueta,
  onCerrar,
  children,
}: {
  abierto: boolean
  etiqueta: string
  onCerrar: () => void
  children: ReactNode
}) {
  const tituloId = useId()
  const refPanel = useRef<HTMLDivElement>(null)
  const reducirMovimiento = useReducedMotion()
  const dragControls = useDragControls()
  const salto = reducirMovimiento === true
  const transicion = salto ? { duration: 0 } : transicionDesplegar

  useEffect(() => {
    if (!abierto) return
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previo
    }
  }, [abierto])

  useEffect(() => {
    if (!abierto) return
    function tecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [abierto, onCerrar])

  useEffect(() => {
    if (!abierto) return
    refPanel.current?.focus()
  }, [abierto])

  return createPortal(
    <AnimatePresence>
      {abierto ? (
        <motion.div
          key="menu-inferior"
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby={tituloId}
          initial={salto ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transicion}
        >
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={onCerrar}
            className="absolute inset-0 bg-black/25"
          />
          <motion.div
            ref={refPanel}
            tabIndex={-1}
            drag={salto ? false : 'y'}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.45 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 88 || info.velocity.y > 500) onCerrar()
            }}
            initial={salto ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={transicion}
            className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[min(88dvh,40rem)] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-md outline-none"
          >
            <div
              className="flex shrink-0 touch-none flex-col gap-2 px-5 pt-4"
              onPointerDown={(evento) => {
                if (!salto) dragControls.start(evento)
              }}
            >
              <p id={tituloId} className="px-2 pb-1 text-sm uppercase tracking-[0.28em] text-black/60">
                {etiqueta}
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5">{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
