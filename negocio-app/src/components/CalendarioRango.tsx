import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { fechaDiaLocal } from '../lib/reglas.ts'
import { transicionDesplegar } from './PanelDesplegable.tsx'

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]
const DIAS_SEMANA = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']

export type SeleccionRango = {
  desde: string | null
  hasta: string | null
}

function hoyEcuador(): string {
  return fechaDiaLocal(new Date().toISOString())
}

function partesFecha(fecha: string): { anio: number; mes: number } | null {
  const [anio, mes] = fecha.split('-').map(Number)
  if (!anio || !mes) return null
  return { anio, mes: mes - 1 }
}

function ymd(anio: number, mes: number, dia: number): string {
  return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

function diasDelMes(anio: number, mes: number): (string | null)[] {
  const primero = new Date(Date.UTC(anio, mes, 1)).getUTCDay()
  const hueco = primero === 0 ? 6 : primero - 1
  const ultimo = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate()
  const celdas: (string | null)[] = Array.from({ length: hueco }, () => null)
  for (let dia = 1; dia <= ultimo; dia++) celdas.push(ymd(anio, mes, dia))
  while (celdas.length % 7 !== 0) celdas.push(null)
  return celdas
}

function enRango(fecha: string, desde: string | null, hasta: string | null): boolean {
  if (!desde) return false
  if (!hasta) return fecha === desde
  return fecha >= desde && fecha <= hasta
}

export function CalendarioRango({
  acento,
  desde,
  hasta,
  onCambiar,
}: {
  acento: string
  desde: string | null
  hasta: string | null
  onCambiar: (rango: SeleccionRango) => void
}) {
  const reducirMovimiento = useReducedMotion()
  const salto = reducirMovimiento === true
  const hoy = hoyEcuador()
  const inicial = partesFecha(desde ?? hoy) ?? { anio: 2026, mes: 0 }
  const [vista, setVista] = useState(inicial)
  const [sentido, setSentido] = useState(1)
  const celdas = useMemo(() => diasDelMes(vista.anio, vista.mes), [vista.anio, vista.mes])

  function mover(delta: number) {
    setSentido(delta)
    setVista((actual) => {
      const mes = actual.mes + delta
      if (mes < 0) return { anio: actual.anio - 1, mes: 11 }
      if (mes > 11) return { anio: actual.anio + 1, mes: 0 }
      return { anio: actual.anio, mes }
    })
  }

  function elegir(fecha: string) {
    if (!desde || (desde && hasta)) {
      onCambiar({ desde: fecha, hasta: null })
      return
    }
    if (fecha < desde) onCambiar({ desde: fecha, hasta: desde })
    else onCambiar({ desde, hasta: fecha })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Mes anterior"
          onClick={() => mover(-1)}
          className="inline-flex size-10 touch-manipulation items-center justify-center rounded-full bg-black/5 [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          <ChevronLeft aria-hidden size={18} />
        </button>
        <p className="font-display text-xl uppercase leading-none tracking-wide">
          {MESES[vista.mes]} {vista.anio}
        </p>
        <button
          type="button"
          aria-label="Mes siguiente"
          onClick={() => mover(1)}
          className="inline-flex size-10 touch-manipulation items-center justify-center rounded-full bg-black/5 [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          <ChevronRight aria-hidden size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-black/50">
        {DIAS_SEMANA.map((dia) => (
          <span key={dia} className="py-1">
            {dia}
          </span>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${vista.anio}-${vista.mes}`}
          initial={salto ? false : { opacity: 0, x: sentido * 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={salto ? undefined : { opacity: 0, x: sentido * -16 }}
          transition={salto ? { duration: 0 } : transicionDesplegar}
          className="grid grid-cols-7 gap-1"
        >
          {celdas.map((fecha, indice) => {
            if (!fecha) return <span key={`vacio-${indice}`} className="size-10" />
            const elegidoExtremo = fecha === desde || fecha === hasta
            const cubierto = enRango(fecha, desde, hasta)
            const esHoy = fecha === hoy
            return (
              <button
                key={fecha}
                type="button"
                onClick={() => elegir(fecha)}
                className={`inline-flex size-10 touch-manipulation items-center justify-center rounded-full text-sm tabular-nums [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                  elegidoExtremo ? 'bg-black text-white' : cubierto ? '' : esHoy ? 'bg-black/5' : ''
                }`}
                style={!elegidoExtremo && cubierto ? { backgroundColor: acento } : undefined}
              >
                {Number(fecha.slice(8))}
              </button>
            )
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
