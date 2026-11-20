function Barra({ className }: { className: string }) {
  return <span aria-hidden="true" className={`esqueleto-brillo block rounded-full ${className}`} />
}

export function EsqueletoTarjeta({ lineas = 3 }: { lineas?: number }) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-sm">
      <Barra className="h-7 w-2/5" />
      {Array.from({ length: lineas }, (_, indice) => (
        <Barra key={indice} className={`h-4 ${indice === lineas - 1 ? 'w-1/2' : 'w-full'}`} />
      ))}
    </div>
  )
}

export function EsqueletoLista({ tarjetas = 3 }: { tarjetas?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: tarjetas }, (_, indice) => (
        <EsqueletoTarjeta key={indice} lineas={indice === 0 ? 4 : 3} />
      ))}
    </div>
  )
}

export function EsqueletoPastilla() {
  return (
    <div className="flex w-full flex-col gap-3 rounded-3xl bg-white p-5 shadow-sm">
      <Barra className="h-4 w-1/3" />
      <Barra className="h-10 w-full rounded-full" />
    </div>
  )
}
