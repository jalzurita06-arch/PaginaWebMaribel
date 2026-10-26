/**
 * Deja el texto listo para un filtro .or() de PostgREST.
 * Quita comillas y separadores para que no se pueda romper la consulta.
 */
export function escaparTerminoOr(valor: string): string {
  return valor
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/["(),]/g, '')
}

/** True si el código o el nombre contienen lo escrito. */
export function coincideCliente(termino: string, codigo: string, nombre: string | null): boolean {
  const consulta = termino.trim().toLocaleLowerCase('es')
  if (!consulta) return true
  if (codigo.toLocaleLowerCase('es').includes(consulta)) return true
  return Boolean(nombre?.toLocaleLowerCase('es').includes(consulta))
}
