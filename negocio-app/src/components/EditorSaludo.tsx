import { useState } from 'react'
import { GripVertical } from 'lucide-react'
import { Reorder, useReducedMotion } from 'framer-motion'
import {
  armarSaludo,
  ETIQUETAS_PIEZA,
  leerSaludo,
  PIEZAS_SALUDO,
  type PiezaSaludo,
} from '../lib/plantilla.ts'

const DATO_PASTILLA = 'application/x-pieza-saludo'

const transparente =
  'max-w-full bg-transparent py-1 text-base outline-none focus-visible:outline-none disabled:opacity-50'

export function EditorSaludo({
  valor,
  ocupado = false,
  acento,
  onChange,
}: {
  valor: string
  ocupado?: boolean
  acento: string
  onChange: (valor: string) => void
}) {
  const armado = leerSaludo(valor)
  const faltantes = PIEZAS_SALUDO.filter((pieza) => !armado.piezas.includes(pieza))
  const [encima, setEncima] = useState(false)
  const salto = useReducedMotion() === true

  function publicar(cambio: Partial<typeof armado>) {
    onChange(armarSaludo({ ...armado, ...cambio }))
  }

  function insertar(pieza: string) {
    if (ocupado) return
    if (pieza !== 'nombre' && pieza !== 'codigo') return
    if (armado.piezas.includes(pieza)) return
    publicar({ piezas: [...armado.piezas, pieza] })
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">Saludo</p>
      <div
        onDragOver={(evento) => {
          if (ocupado || faltantes.length === 0) return
          evento.preventDefault()
          setEncima(true)
        }}
        onDragLeave={() => setEncima(false)}
        onDrop={(evento) => {
          evento.preventDefault()
          setEncima(false)
          insertar(evento.dataTransfer.getData(DATO_PASTILLA) || evento.dataTransfer.getData('text/plain'))
        }}
        className={`flex min-h-14 flex-wrap items-center gap-2 rounded-3xl bg-fondo px-4 py-3 ${encima ? 'ring-2 ring-black' : ''}`}
      >
        <input
          aria-label="Texto al inicio del saludo"
          value={armado.prefijo}
          disabled={ocupado}
          onChange={(evento) => publicar({ prefijo: evento.target.value })}
          style={{ width: `${Math.max(4, armado.prefijo.length + 1)}ch` }}
          className={transparente}
        />
        {armado.piezas.length > 0 ? (
          <Reorder.Group
            axis="x"
            values={armado.piezas}
            onReorder={(piezas) => publicar({ piezas: piezas as PiezaSaludo[] })}
            className="flex flex-wrap items-center gap-2"
          >
            {armado.piezas.map((pieza) => (
              <Reorder.Item
                key={pieza}
                value={pieza}
                drag={ocupado ? false : true}
                whileDrag={salto ? undefined : { scale: 1.06 }}
                className="inline-flex items-center gap-1 rounded-full bg-black px-3 py-2 text-sm text-white"
              >
                <GripVertical aria-hidden size={14} strokeWidth={2} />
                {ETIQUETAS_PIEZA[pieza]}
                <button
                  type="button"
                  aria-label={`Quitar ${ETIQUETAS_PIEZA[pieza]}`}
                  disabled={ocupado}
                  onPointerDown={(evento) => evento.stopPropagation()}
                  onClick={() => publicar({ piezas: armado.piezas.filter((item) => item !== pieza) })}
                  className="grid size-6 place-items-center rounded-full bg-white/20 [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-40"
                >
                  ×
                </button>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        ) : (
          <p className="text-sm text-black/45">Suelta aquí Nombre o Código</p>
        )}
        <input
          aria-label="Texto al final del saludo"
          value={armado.sufijo}
          disabled={ocupado}
          onChange={(evento) => publicar({ sufijo: evento.target.value })}
          style={{ width: `${Math.max(4, armado.sufijo.length + 1)}ch` }}
          className={transparente}
        />
      </div>
      {faltantes.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-black/60">Arrastra al saludo:</p>
          {faltantes.map((pieza) => (
            <button
              key={pieza}
              type="button"
              draggable={!ocupado}
              disabled={ocupado}
              onDragStart={(evento) => {
                evento.dataTransfer.setData(DATO_PASTILLA, pieza)
                evento.dataTransfer.setData('text/plain', pieza)
                evento.dataTransfer.effectAllowed = 'copy'
              }}
              onClick={() => insertar(pieza)}
              className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-40"
              style={{ backgroundColor: acento }}
            >
              <GripVertical aria-hidden size={14} strokeWidth={2} />
              {ETIQUETAS_PIEZA[pieza]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
