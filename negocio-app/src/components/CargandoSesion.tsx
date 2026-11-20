import { LogoMarca } from './LogoMarca.tsx'
import { EsqueletoPastilla, EsqueletoTarjeta } from './Esqueleto.tsx'

/** Se muestra mientras se revalida la sesión al abrir la app. */
export function CargandoSesion() {
  return (
    <main className="grid min-h-dvh place-items-center bg-fondo px-5 text-black" aria-busy="true">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <LogoMarca variante="completo" className="h-20 w-auto drop-shadow-sm" />
        <p role="status" className="text-sm uppercase tracking-[0.28em]">
          Revisando la sesión
        </p>
        <div className="flex w-full flex-col gap-3">
          <EsqueletoPastilla />
          <EsqueletoTarjeta lineas={2} />
        </div>
      </div>
    </main>
  )
}
