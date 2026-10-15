import { acentoInicio } from '../config/secciones.ts'
import { LogoMarca } from './LogoMarca.tsx'

/** Se muestra mientras supabase-js lee la sesión guardada al abrir la app. */
export function CargandoSesion() {
  return (
    <main
      className="grid min-h-dvh place-items-center bg-fondo px-5 text-black"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-5">
        <LogoMarca acento={acentoInicio} className="size-20 drop-shadow-sm" />
        <p role="status" className="text-sm uppercase tracking-[0.28em]">
          Revisando la sesión
        </p>
      </div>
    </main>
  )
}
