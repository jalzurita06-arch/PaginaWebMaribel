/** Redondea a centavos. El desplazamiento e+2 evita errores de punto flotante. */
export function redondear2(valor: number): number {
  const redondeado = +(Math.round(+(valor + 'e+2')) + 'e-2')
  return redondeado === 0 ? 0 : redondeado
}

export function formatearDolares(valor: number): string {
  return `$${redondear2(valor).toFixed(2)}`
}
