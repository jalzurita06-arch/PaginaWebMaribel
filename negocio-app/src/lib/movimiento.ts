export const toque = { scale: 0.97 } as const

export const transicionToque = { duration: 0.15 } as const

/** Pastilla interactiva: toque, foco y hover. Respeta reduced-motion vía CSS global. */
export const claseToque =
  'toque-activo touch-manipulation [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50'
