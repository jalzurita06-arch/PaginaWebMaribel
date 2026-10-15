export type SenalesDispositivo = {
  memoriaGb: number | null
  nucleos: number | null
  telefono: boolean
  reducirMovimiento: boolean
}

export type SenalesRed = {
  effectiveType?: string
  saveData?: boolean
  downlink?: number
}

/**
 * Un celular de gama alta (como un S25 Ultra, que reporta 8 GB) anima.
 * Uno corto de memoria o de núcleos no: ahí el movimiento se ve trabado.
 * En computadora se anima, salvo que tenga muy poca memoria o el sistema pida menos movimiento.
 */
export function permiteAnimaciones(senales: SenalesDispositivo): boolean {
  if (senales.reducirMovimiento) return false

  if (!senales.telefono) return senales.memoriaGb == null || senales.memoriaGb > 2

  if (senales.memoriaGb != null && senales.memoriaGb >= 8) return true
  if (senales.memoriaGb != null && senales.memoriaGb <= 4) return false
  return (senales.nucleos ?? 0) >= 6
}

/** 2G, 3G, ahorro de datos o menos de 1 Mbps: la red no da para pedir todo junto. */
export function redEsLenta(conexion: SenalesRed | null | undefined): boolean {
  if (!conexion) return false
  if (conexion.saveData) return true
  if (
    conexion.effectiveType === 'slow-2g' ||
    conexion.effectiveType === '2g' ||
    conexion.effectiveType === '3g'
  ) {
    return true
  }
  return typeof conexion.downlink === 'number' && conexion.downlink > 0 && conexion.downlink < 1
}

type NavegadorCapacidad = Navigator & {
  deviceMemory?: number
  connection?: SenalesRed
}

export function leerSenalesDispositivo(): SenalesDispositivo {
  if (typeof navigator === 'undefined') {
    return { memoriaGb: null, nucleos: null, telefono: false, reducirMovimiento: false }
  }

  const navegador = navigator as NavegadorCapacidad
  const memoria = typeof navegador.deviceMemory === 'number' ? navegador.deviceMemory : null
  const nucleos = typeof navigator.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency : null

  return {
    memoriaGb: memoria,
    nucleos,
    telefono: esTelefono(),
    reducirMovimiento:
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  }
}

export function leerSenalesRed(): SenalesRed | null {
  if (typeof navigator === 'undefined') return null
  const conexion = (navigator as NavegadorCapacidad).connection
  return conexion ?? null
}

/** Marca el documento antes de pintar, para que un celular lento no anime ni un frame. */
export function aplicarAnimaciones(senales: SenalesDispositivo = leerSenalesDispositivo()): boolean {
  const permitir = permiteAnimaciones(senales)
  if (typeof document === 'undefined') return permitir
  document.documentElement.dataset.animaciones = permitir ? 'si' : 'no'
  document.documentElement.classList.toggle('dispositivo-lento', !permitir)
  return permitir
}

export function subirAlInicio() {
  if (typeof window === 'undefined') return
  const reducir =
    document.documentElement.classList.contains('dispositivo-lento') ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reducir ? 'auto' : 'smooth' })
}

function esTelefono(): boolean {
  if (typeof screen === 'undefined') return false
  let lado = Math.min(screen.width, screen.height)
  const densidad = window.devicePixelRatio || 1
  if (lado > 800 && densidad > 1) lado = lado / densidad
  return lado > 0 && lado <= 520
}
