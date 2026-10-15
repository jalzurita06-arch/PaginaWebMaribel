import { z } from 'zod'
import { redondear2 } from './dinero.ts'

/** Montos iniciales del catálogo, en el orden en que se muestran. */
export const VALORES_EJEMPLO = [3.5, 5, 6, 7, 7.5, 8, 10, 12] as const

export type DireccionOrden = 'subir' | 'bajar'

export type CambioOrden = {
  id: string
  orden: number
}

const esquemaPresente = z.string().trim().min(1, 'Escribe un valor.')
const esquemaMonto = z
  .string()
  .regex(/^\d+(?:\.\d{1,2})?$/, 'Escribe un monto válido. Usa hasta 2 decimales.')

/** null si el monto se puede guardar. No compara el valor consigo mismo: eso lo resuelve quien llama. */
export function validarValorPrecio(texto: string, existentes: number[]): string | null {
  const presente = esquemaPresente.safeParse(texto)
  if (!presente.success) return presente.error.issues[0]?.message ?? 'Escribe un valor.'

  const limpio = presente.data.replace(',', '.')
  if (limpio.startsWith('-')) return 'El valor debe ser mayor que 0.'

  const formato = esquemaMonto.safeParse(limpio)
  if (!formato.success) return formato.error.issues[0]?.message ?? 'Escribe un monto válido. Usa hasta 2 decimales.'

  const valor = redondear2(Number(formato.data))
  if (!(valor > 0)) return 'El valor debe ser mayor que 0.'

  if (existentes.some((existente) => redondear2(existente) === valor)) {
    return 'Ese valor ya está en el catálogo.'
  }

  return null
}

/** Solo llamarla después de validarValorPrecio. */
export function montoDesdeTexto(texto: string): number {
  return redondear2(Number(texto.trim().replace(',', '.')))
}

export function siguienteOrden(ordenes: number[]): number {
  if (ordenes.length === 0) return 1
  return Math.max(...ordenes) + 1
}

/**
 * La lista ya viene en el orden de pantalla.
 * Intercambia el orden con el vecino. Si ambos tienen el mismo número, renumera para que el movimiento se note.
 */
export function cambiosDeOrden(
  lista: { id: string; orden: number }[],
  id: string,
  direccion: DireccionOrden,
): { ok: true; cambios: CambioOrden[] } | { ok: false; motivo: 'no-encontrado' | 'borde' } {
  const indice = lista.findIndex((precio) => precio.id === id)
  if (indice < 0) return { ok: false, motivo: 'no-encontrado' }

  const destino = direccion === 'subir' ? indice - 1 : indice + 1
  if (destino < 0 || destino >= lista.length) return { ok: false, motivo: 'borde' }

  const actual = lista[indice]
  const vecino = lista[destino]
  if (!actual || !vecino) return { ok: false, motivo: 'borde' }

  if (actual.orden !== vecino.orden) {
    return {
      ok: true,
      cambios: [
        { id: actual.id, orden: vecino.orden },
        { id: vecino.id, orden: actual.orden },
      ],
    }
  }

  const copia = lista.slice()
  const [movido] = copia.splice(indice, 1)
  if (!movido) return { ok: false, motivo: 'no-encontrado' }
  copia.splice(destino, 0, movido)

  const cambios = copia.flatMap((precio, posicion) => {
    const orden = posicion + 1
    return precio.orden === orden ? [] : [{ id: precio.id, orden }]
  })

  return { ok: true, cambios }
}
