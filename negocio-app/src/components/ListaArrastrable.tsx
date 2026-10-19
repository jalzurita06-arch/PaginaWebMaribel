import { Reorder, useDragControls, useReducedMotion } from 'framer-motion'
import { GripVertical } from 'lucide-react'
import type { ReactNode } from 'react'

const toque = { scale: 1.02, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }

export function ListaArrastrable<T>({
  items,
  idDe,
  ocupado = false,
  onReorder,
  render,
}: {
  items: T[]
  idDe: (item: T) => string
  ocupado?: boolean
  onReorder: (items: T[]) => void
  render: (item: T) => ReactNode
}) {
  const ids = items.map(idDe)

  function alReordenar(nuevos: string[]) {
    const mapa = new Map(items.map((item) => [idDe(item), item]))
    onReorder(nuevos.flatMap((id) => {
      const item = mapa.get(id)
      return item ? [item] : []
    }))
  }

  return (
    <Reorder.Group axis="y" values={ids} onReorder={alReordenar} className="flex flex-col gap-2">
      {items.map((item) => {
        const id = idDe(item)
        return (
          <FilaArrastrable key={id} id={id} ocupado={ocupado}>
            {render(item)}
          </FilaArrastrable>
        )
      })}
    </Reorder.Group>
  )
}

function FilaArrastrable({
  id,
  ocupado,
  children,
}: {
  id: string
  ocupado: boolean
  children: ReactNode
}) {
  const controls = useDragControls()
  const salto = useReducedMotion() === true

  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={controls}
      drag={ocupado ? false : true}
      whileDrag={salto ? undefined : toque}
      className="flex items-center gap-2 rounded-3xl bg-fondo px-3 py-2"
    >
      <button
        type="button"
        aria-label="Arrastrar para cambiar el orden"
        disabled={ocupado}
        onPointerDown={(evento) => {
          if (ocupado) return
          controls.start(evento)
        }}
        className="grid size-11 shrink-0 touch-none place-items-center rounded-full bg-white [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-40"
      >
        <GripVertical aria-hidden size={18} strokeWidth={2} />
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
    </Reorder.Item>
  )
}

export function PastillasArrastrables({
  piezas,
  ocupado = false,
  etiquetaDe,
  onReorder,
  onQuitar,
}: {
  piezas: string[]
  ocupado?: boolean
  etiquetaDe: (pieza: string) => string
  onReorder: (piezas: string[]) => void
  onQuitar: (pieza: string) => void
}) {
  const salto = useReducedMotion() === true

  return (
    <Reorder.Group
      axis="x"
      values={piezas}
      onReorder={onReorder}
      className="flex min-h-12 flex-wrap items-center gap-2"
    >
      {piezas.map((pieza) => (
        <Reorder.Item
          key={pieza}
          value={pieza}
          drag={ocupado ? false : true}
          whileDrag={salto ? undefined : { scale: 1.06 }}
          className="inline-flex items-center gap-1 rounded-full bg-black px-4 py-2 text-sm text-white"
        >
          <GripVertical aria-hidden size={14} strokeWidth={2} />
          {etiquetaDe(pieza)}
          <button
            type="button"
            aria-label={`Quitar ${etiquetaDe(pieza)}`}
            disabled={ocupado}
            onPointerDown={(evento) => evento.stopPropagation()}
            onClick={() => onQuitar(pieza)}
            className="ml-1 grid size-6 place-items-center rounded-full bg-white/20 [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-40"
          >
            ×
          </button>
        </Reorder.Item>
      ))}
    </Reorder.Group>
  )
}
