/** Se muestra mientras supabase-js lee la sesión guardada al abrir la app. */
export function CargandoSesion() {
  return (
    <main
      className="grid min-h-dvh place-items-center bg-fondo px-5 text-black"
      aria-busy="true"
    >
      <p role="status" className="text-sm uppercase tracking-[0.28em]">
        Revisando la sesión
      </p>
    </main>
  )
}
