import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import type { EstadoCliente } from '../services/clientes.ts'
import { EtiquetaEstado } from './EtiquetaEstado.tsx'
import { transicionDesplegar } from './PanelDesplegable.tsx'

const foco =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50'

export function BotonEtiquetaEstado({
  codigo,
  estado,
  abierto,
  guardando,
  disabled,
  panelId,
  anchoCompleto = false,
  botonRef,
  onClick,
}: {
  codigo: string
  estado: string
  abierto: boolean
  guardando: boolean
  disabled: boolean
  panelId: string
  anchoCompleto?: boolean
  botonRef?: RefObject<HTMLButtonElement | null>
  onClick: () => void
}) {
  return (
    <button
      ref={botonRef}
      type="button"
      disabled={disabled}
      aria-expanded={abierto}
      aria-controls={panelId}
      aria-label={`Estado de ${codigo}`}
      onClick={onClick}
      className={`${anchoCompleto ? 'w-full' : 'inline-flex'} rounded-full ${foco}`}
    >
      {guardando ? (
        <span
          className={`inline-flex min-h-11 items-center justify-center rounded-full bg-black/5 px-4 text-sm ${anchoCompleto ? 'w-full px-3' : ''}`}
        >
          Guardando…
        </span>
      ) : (
        <EtiquetaEstado estado={estado} className={anchoCompleto ? 'w-full justify-center' : ''} />
      )}
    </button>
  )
}

export function OpcionesEstadoCliente({
  codigo,
  estado,
  enLinea,
  compacto = false,
  id,
  onElegirEstado,
  onBloquear,
}: {
  codigo: string
  estado: string
  enLinea: boolean
  compacto?: boolean
  id?: string
  onElegirEstado: (estado: EstadoCliente) => void
  onBloquear: () => void
}) {
  const clase = compacto
    ? `min-h-11 rounded-full px-5 text-sm ${foco}`
    : `min-h-12 rounded-full px-5 text-base ${foco}`

  return (
    <div id={id} role="group" aria-label={`Elige el estado de ${codigo}`} className="flex flex-col gap-2">
      <button
        type="button"
        disabled={!enLinea}
        aria-pressed={estado === 'activo'}
        onClick={() => onElegirEstado('activo')}
        className={`${clase} bg-afirmar`}
      >
        Activo
      </button>
      <button
        type="button"
        disabled={!enLinea}
        aria-pressed={estado === 'inactivo'}
        onClick={() => onElegirEstado('inactivo')}
        className={`${clase} bg-peligro`}
      >
        Inactivo
      </button>
      <button type="button" disabled={!enLinea} onClick={onBloquear} className={`${clase} bg-borrar`}>
        Bloqueado
      </button>
    </div>
  )
}

export function MenuEstadoFlotante({
  abierto,
  panelId,
  anclaRef,
  onCerrar,
  children,
}: {
  abierto: boolean
  panelId: string
  anclaRef: RefObject<HTMLButtonElement | null>
  onCerrar: () => void
  children: ReactNode
}) {
  const refMenu = useRef<HTMLDivElement>(null)
  const salto = useReducedMotion() === true

  useLayoutEffect(() => {
    if (!abierto) return

    function colocar() {
      const boton = anclaRef.current
      const menu = refMenu.current
      if (!boton || !menu) return
      const origen = boton.getBoundingClientRect()
      const caja = menu.getBoundingClientRect()
      let top = origen.top - caja.height - 8
      if (top < 8) top = origen.bottom + 8
      let left = origen.left + origen.width / 2 - caja.width / 2
      left = Math.min(Math.max(8, left), window.innerWidth - caja.width - 8)
      menu.style.top = `${top}px`
      menu.style.left = `${left}px`
      menu.style.visibility = 'visible'
    }

    colocar()
    window.addEventListener('resize', colocar)
    window.addEventListener('scroll', colocar, true)
    return () => {
      window.removeEventListener('resize', colocar)
      window.removeEventListener('scroll', colocar, true)
    }
  }, [abierto, anclaRef])

  useEffect(() => {
    if (!abierto) return
    refMenu.current?.querySelector('button')?.focus()
  }, [abierto])

  useEffect(() => {
    if (!abierto) return

    function cerrar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onCerrar()
    }
    function clicFuera(evento: PointerEvent) {
      const destino = evento.target
      if (!(destino instanceof Node)) return
      if (anclaRef.current?.contains(destino) || refMenu.current?.contains(destino)) return
      onCerrar()
    }
    window.addEventListener('keydown', cerrar)
    window.addEventListener('pointerdown', clicFuera)
    return () => {
      window.removeEventListener('keydown', cerrar)
      window.removeEventListener('pointerdown', clicFuera)
    }
  }, [abierto, anclaRef, onCerrar])

  if (!abierto) return null

  return createPortal(
    <motion.div
      ref={refMenu}
      id={panelId}
      initial={salto ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={salto ? { duration: 0 } : transicionDesplegar}
      className="fixed z-[60] flex w-40 flex-col gap-2 rounded-3xl bg-white p-3 shadow-md"
      style={{ top: 0, left: 0, visibility: 'hidden' }}
    >
      {children}
    </motion.div>,
    document.body,
  )
}
