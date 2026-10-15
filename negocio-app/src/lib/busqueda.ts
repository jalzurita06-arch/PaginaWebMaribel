/** True si el código o el nombre contienen lo escrito. */
export function coincideCliente(termino: string, codigo: string, nombre: string | null): boolean {
  const consulta = termino.trim().toLocaleLowerCase('es')
  if (!consulta) return true
  if (codigo.toLocaleLowerCase('es').includes(consulta)) return true
  return Boolean(nombre?.toLocaleLowerCase('es').includes(consulta))
}
