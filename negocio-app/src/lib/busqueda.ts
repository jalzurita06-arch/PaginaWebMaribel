/** True si el código o el nombre contienen lo escrito. */
export function coincideCliente(termino: string, codigo: string, nombre: string | null): boolean {
  const consulta = termino.trim().toLocaleLowerCase('es')
  if (!consulta) return true
  if (codigo.toLocaleLowerCase('es').includes(consulta)) return true
  return Boolean(nombre?.toLocaleLowerCase('es').includes(consulta))
}

export function sugerirClientes<T extends { codigo: string; nombre: string | null }>(
  termino: string,
  opciones: T[],
  limite = 6,
): T[] {
  if (!termino.trim()) return []
  return opciones.filter((opcion) => coincideCliente(termino, opcion.codigo, opcion.nombre)).slice(0, limite)
}
