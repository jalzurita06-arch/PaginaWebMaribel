import { ChevronDown, ChevronUp, Pencil, Trash } from 'lucide-react'
import { useConexion } from '../context/useConexion.ts'
import { formatearDolares } from '../lib/dinero.ts'
import type { Precio } from '../services/precios.ts'
import { BotonAccion } from './BotonAccion.tsx'
import { FormularioValor } from './FormularioValor.tsx'

const AVISO_CANASTA = 'Los precios ya guardados en canastas no cambian.'

type TarjetaPrecioProps = {
  precio: Precio
  acento: string
  esPrimero: boolean
  esUltimo: boolean
  ocupado: boolean
  editando: boolean
  eliminando: boolean
  existentes: number[]
  errorServidor: string | null
  onEditar: () => void
  onEliminar: () => void
  onCancelar: () => void
  onEscribir: () => void
  onGuardar: (valor: number) => void
  onConfirmarEliminar: () => void
  onSubir: () => void
  onBajar: () => void
}

export function TarjetaPrecio({
  precio,
  acento,
  esPrimero,
  esUltimo,
  ocupado,
  editando,
  eliminando,
  existentes,
  errorServidor,
  onEditar,
  onEliminar,
  onCancelar,
  onEscribir,
  onGuardar,
  onConfirmarEliminar,
  onSubir,
  onBajar,
}: TarjetaPrecioProps) {
  const { enLinea } = useConexion()
  const monto = formatearDolares(precio.valor)

  return (
    <article className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm">
      {editando ? (
        <>
          <p className="text-sm">Editar {monto}</p>
          <FormularioValor
            textoInicial={precio.valor.toFixed(2)}
            textoBoton="Guardar"
            existentes={existentes}
            ocupado={ocupado}
            errorServidor={errorServidor}
            aviso={AVISO_CANASTA}
            onCancelar={onCancelar}
            onEscribir={onEscribir}
            onGuardar={onGuardar}
          />
        </>
      ) : eliminando ? (
        <>
          <p className="text-base">¿Eliminar {monto}?</p>
          <p className="rounded-3xl bg-aviso px-4 py-3 text-sm leading-relaxed">{AVISO_CANASTA}</p>
          {errorServidor ? (
            <p role="alert" className="text-sm">
              {errorServidor}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <BotonAccion variante="borrar" onClick={onConfirmarEliminar} disabled={ocupado || !enLinea}>
              {ocupado ? 'Eliminando…' : 'Eliminar'}
            </BotonAccion>
            <BotonAccion onClick={onCancelar} disabled={ocupado}>
              Cancelar
            </BotonAccion>
          </div>
        </>
      ) : (
        <>
          <p
            className="inline-flex w-fit rounded-2xl px-3 py-1.5 font-display text-3xl leading-none tracking-wide lg:px-4 lg:py-2 lg:text-5xl"
            style={{ backgroundColor: acento }}
          >
            {monto}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <BotonAccion variante="primario" onClick={onEditar} disabled={ocupado}>
              <Pencil aria-hidden size={18} strokeWidth={2} />
              Editar
            </BotonAccion>
            <BotonAccion variante="borrar" onClick={onEliminar} disabled={ocupado}>
              <Trash aria-hidden size={18} strokeWidth={2} />
              Eliminar
            </BotonAccion>
            <BotonAccion onClick={onSubir} disabled={ocupado || esPrimero || !enLinea}>
              <ChevronUp aria-hidden size={18} strokeWidth={2} />
              Subir
            </BotonAccion>
            <BotonAccion onClick={onBajar} disabled={ocupado || esUltimo || !enLinea}>
              <ChevronDown aria-hidden size={18} strokeWidth={2} />
              Bajar
            </BotonAccion>
          </div>
        </>
      )}
    </article>
  )
}
