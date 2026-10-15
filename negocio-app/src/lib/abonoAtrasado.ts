export const DIAS_SIN_ABONO = 5

/** Día en que el último abono ya cumple 5 días. Ese día se marca, y también los anteriores. */
export function fechaCorteAbono(ahora: Date): string {
  const corte = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - DIAS_SIN_ABONO)
  const mes = String(corte.getMonth() + 1).padStart(2, '0')
  const dia = String(corte.getDate()).padStart(2, '0')
  return `${corte.getFullYear()}-${mes}-${dia}`
}

/** Sin abono, o el último ya tiene 5 días o más. */
export function abonoAtrasado(fechaUltimo: string | null | undefined, ahora: Date): boolean {
  if (!fechaUltimo) return true
  return fechaUltimo.slice(0, 10) <= fechaCorteAbono(ahora)
}

/** Deja solo la fecha más reciente de cada clienta. */
export function ultimasFechasAbono(filas: { clienteId: string; fecha: string }[]): Record<string, string> {
  const fechas: Record<string, string> = {}
  for (const fila of filas) {
    const dia = fila.fecha.slice(0, 10)
    const actual = fechas[fila.clienteId]
    if (!actual || dia > actual) fechas[fila.clienteId] = dia
  }
  return fechas
}
