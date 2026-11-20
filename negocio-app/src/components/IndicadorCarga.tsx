import { EsqueletoLista, EsqueletoPastilla, EsqueletoTarjeta } from './Esqueleto.tsx'

type VarianteCarga = 'tarjeta' | 'lista' | 'linea'

export function IndicadorCarga({
  children,
  variante = 'tarjeta',
}: {
  children: string
  variante?: VarianteCarga
}) {
  return (
    <div role="status" aria-busy="true" aria-label={children} className="flex flex-col gap-3">
      <p className="sr-only">{children}</p>
      {variante === 'lista' ? <EsqueletoLista /> : null}
      {variante === 'tarjeta' ? <EsqueletoTarjeta /> : null}
      {variante === 'linea' ? <EsqueletoPastilla /> : null}
    </div>
  )
}
