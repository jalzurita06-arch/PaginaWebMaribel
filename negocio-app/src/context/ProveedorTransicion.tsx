import { motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { acentoInicio } from '../config/secciones.ts'
import { subirAlInicio } from '../lib/dispositivo.ts'
import { MS_CUBRIR, MS_REVELAR, MS_TOPE_CUBRIR, destinoDeSalto } from '../lib/transicion.ts'
import { ContextoTransicion } from './contextoTransicion.ts'

type Fase = 'idle' | 'cubrir' | 'revelar'

const suave = [0.22, 1, 0.36, 1] as const

const variantes = {
  cubrir: {
    clipPath: 'inset(0% 0% 0% 0%)',
    opacity: 1,
    transition: { duration: MS_CUBRIR / 1000, ease: suave },
  },
  revelar: {
    clipPath: 'inset(0% 0% 0% 100%)',
    opacity: 0,
    transition: { duration: MS_REVELAR / 1000, ease: suave },
  },
}

function sinMovimiento(reducir: boolean | null): boolean {
  if (reducir) return true
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dispositivo-lento')
}

export function ProveedorTransicion({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const ubicacion = useLocation()
  const reducirMovimiento = useReducedMotion()
  const [fase, setFase] = useState<Fase>('idle')
  const [acento, setAcento] = useState(acentoInicio)
  const ocupado = useRef(false)

  const irA = useCallback(
    (ruta: string, acentoDestino: string) => {
      const destino = destinoDeSalto(ubicacion.pathname, ruta)
      if (!destino) return

      if (!sinMovimiento(reducirMovimiento) && !ocupado.current) {
        ocupado.current = true
        setAcento(acentoDestino)
        setFase('cubrir')
      }

      navigate(destino)
      subirAlInicio()
    },
    [navigate, reducirMovimiento, ubicacion.pathname],
  )

  useEffect(() => {
    if (fase !== 'cubrir') return
    const paso = window.setTimeout(() => setFase('revelar'), MS_CUBRIR)
    const tope = window.setTimeout(() => setFase('revelar'), MS_TOPE_CUBRIR)
    return () => {
      window.clearTimeout(paso)
      window.clearTimeout(tope)
    }
  }, [fase])

  useEffect(() => {
    if (fase !== 'revelar') return
    const id = window.setTimeout(() => {
      ocupado.current = false
      setFase('idle')
    }, MS_REVELAR)
    return () => window.clearTimeout(id)
  }, [fase])

  const valor = useMemo(() => ({ irA }), [irA])

  return (
    <ContextoTransicion.Provider value={valor}>
      {children}
      {fase === 'idle' ? null : (
        <div
          className={`fixed inset-0 z-[80] ${fase === 'cubrir' ? 'pointer-events-auto' : 'pointer-events-none'}`}
          aria-hidden="true"
        >
          <motion.div
            initial={{ clipPath: 'inset(0% 100% 0% 0%)', opacity: 1 }}
            animate={fase}
            variants={variantes}
            className="absolute inset-0"
            style={{ backgroundColor: acento }}
          />
        </div>
      )}
    </ContextoTransicion.Provider>
  )
}
