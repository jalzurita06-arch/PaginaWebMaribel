import { useEffect, useId, useRef } from 'react'
import { useConexion } from '../context/useConexion.ts'
import { IndicadorCarga } from './IndicadorCarga.tsx'
import { formatearDolares } from '../lib/dinero.ts'
import { agruparPorPrecio, totalCanasta } from '../lib/reglas.ts'
import type { Cliente, PrendaCanasta } from '../services/clientes.ts'
import { EtiquetaEstado } from './EtiquetaEstado.tsx'

type Props = {
  cliente: Cliente
  acento: string
  ocupado: boolean
  cargando?: boolean
  confirmacion: { prendas: PrendaCanasta[] | null; motivo: 'eliminar' | 'bloquear' } | null
  onEditar: () => void
  onCambiarEstado: () => void
  onPedirEliminar: () => void
  onConfirmarEliminar: () => void
  onCancelarEliminar: () => void
}

const boton =
  'min-h-12 w-full touch-manipulation rounded-full px-5 py-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50'

export function DetalleCliente({
  cliente,
  acento,
  ocupado,
  cargando = false,
  confirmacion,
  onEditar,
  onCambiarEstado,
  onPedirEliminar,
  onConfirmarEliminar,
  onCancelarEliminar,
}: Props) {
  const { enLinea } = useConexion()
  const tituloConfirmacion = useId()
  const refConfirmacion = useRef<HTMLElement>(null)
  const yaEnfoco = useRef(false)
  const prendas = confirmacion?.prendas ?? null
  const bloquear = confirmacion?.motivo === 'bloquear'
  const grupos = prendas ? agruparPorPrecio(prendas) : []
  const activo = cliente.estado === 'activo'

  useEffect(() => {
    if (!confirmacion) {
      yaEnfoco.current = false
      return
    }
    if (yaEnfoco.current) return
    yaEnfoco.current = true
    refConfirmacion.current?.focus()
  }, [confirmacion])

  return (
    <div className="flex flex-col gap-5">
      {cargando ? <IndicadorCarga>Cargando cliente…</IndicadorCarga> : null}

      <article className="flex flex-col gap-5 rounded-3xl bg-white p-5 shadow-sm lg:p-8">
        <div className="flex items-start justify-between gap-4">
          <h2 className="min-w-0 break-words font-display text-3xl uppercase leading-none tracking-wide lg:text-5xl">
            {cliente.codigo}
          </h2>
          <EtiquetaEstado estado={cliente.estado} />
        </div>

        <dl className="grid gap-4 text-base lg:grid-cols-3 lg:gap-6">
          <div>
            <dt className="text-sm text-black/60">Nombre</dt>
            <dd className="break-words">{cliente.nombre ?? 'Sin nombre'}</dd>
          </div>
          <div>
            <dt className="text-sm text-black/60">Teléfono</dt>
            <dd>
              <a
                href={`tel:${cliente.telefono}`}
                className="underline decoration-black/30 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                {cliente.telefono}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-black/60">Saldo a favor</dt>
            <dd className="text-2xl">{formatearDolares(cliente.saldo_favor)}</dd>
          </div>
        </dl>

        {confirmacion ? (
          <section
            ref={refConfirmacion}
            tabIndex={-1}
            aria-labelledby={prendas == null ? undefined : tituloConfirmacion}
            aria-busy={prendas == null}
            className="flex flex-col gap-4 rounded-3xl bg-fondo p-4 outline-none"
          >
            {prendas == null ? (
              <IndicadorCarga>Revisando la canasta…</IndicadorCarga>
            ) : (
              <h3 id={tituloConfirmacion} className="text-base">
                {prendas.length > 0
                  ? 'Este cliente tiene prendas en la canasta.'
                  : bloquear
                    ? '¿Bloquear a este cliente?'
                    : '¿Eliminar este cliente?'}
              </h3>
            )}

            {prendas != null && prendas.length > 0 ? (
              <>
                <ul className="flex flex-col gap-2">
                  {grupos.map((grupo) => (
                    <li key={grupo.precio} className="flex items-baseline justify-between gap-3">
                      <span>
                        {formatearDolares(grupo.precio)} × {grupo.cantidad}
                      </span>
                      <span>{formatearDolares(grupo.subtotal)}</span>
                    </li>
                  ))}
                </ul>
                <p className="flex items-baseline justify-between gap-3 font-medium">
                  <span>Total</span>
                  <span>{formatearDolares(totalCanasta(grupos))}</span>
                </p>
                <p className="text-sm leading-relaxed">
                  {bloquear
                    ? 'Si lo bloqueas, se borra el cliente y también la canasta, los abonos y los envíos.'
                    : 'Si lo eliminas, se borran también la canasta, los abonos y los envíos.'}
                </p>
              </>
            ) : null}

            {prendas != null && prendas.length === 0 ? (
              <p className="text-sm leading-relaxed">
                {bloquear
                  ? 'Se borra el cliente y también su canasta, sus abonos y sus envíos.'
                  : 'Se borran también su canasta, sus abonos y sus envíos.'}
              </p>
            ) : null}

            <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
              <button
                type="button"
                onClick={onConfirmarEliminar}
                disabled={ocupado || prendas == null || !enLinea}
                className={`${boton} bg-borrar`}
              >
                {ocupado ? (bloquear ? 'Bloqueando…' : 'Eliminando…') : bloquear ? 'Bloquear cliente' : 'Eliminar cliente'}
              </button>
              <button
                type="button"
                onClick={onCancelarEliminar}
                disabled={ocupado}
                className={`${boton} bg-black/5`}
              >
                Cancelar
              </button>
            </div>
          </section>
        ) : (
          <div className="flex flex-col gap-3 lg:grid lg:grid-cols-3">
            <button
              type="button"
              onClick={onEditar}
              disabled={ocupado}
              className={boton}
              style={{ backgroundColor: acento }}
            >
              Editar
            </button>
            <button
              type="button"
              onClick={onCambiarEstado}
              disabled={ocupado || !enLinea}
              className={`${boton} ${activo ? 'bg-peligro' : 'bg-afirmar'}`}
            >
              {ocupado ? 'Guardando…' : activo ? 'Cambiar a inactivo' : 'Cambiar a activo'}
            </button>
            <button
              type="button"
              onClick={onPedirEliminar}
              disabled={ocupado || !enLinea}
              className={`${boton} bg-borrar`}
            >
              Eliminar
            </button>
          </div>
        )}
      </article>
    </div>
  )
}
