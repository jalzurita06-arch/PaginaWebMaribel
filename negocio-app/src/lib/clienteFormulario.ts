import { z } from 'zod'
import { redondear2 } from './dinero.ts'

const esquemaCliente = z.object({
  codigo: z.string().trim().min(1, 'Escribe el código.').transform(normalizarCodigo),
  nombre: z.string().trim(),
  telefono: z
    .string()
    .trim()
    .min(1, 'Escribe el teléfono.')
    .regex(/^\d+$/, 'El teléfono solo puede tener números.')
    .length(10, 'El teléfono debe tener 10 dígitos.'),
})

const esquemaNuevo = esquemaCliente
  .extend({
    abonoInicial: z.string().trim(),
  })
  .superRefine((datos, ctx) => {
    const mensaje = mensajeAbono(datos.abonoInicial)
    if (!mensaje) return
    ctx.addIssue({ code: 'custom', path: ['abonoInicial'], message: mensaje })
  })

export type DatosNuevoCliente = {
  codigo: string
  nombre: string | null
  telefono: string
  abonoInicial: number | null
}

export type DatosEdicionCliente = {
  codigo: string
  nombre: string | null
  telefono: string
}

export type ErroresCliente = {
  codigo?: string
  nombre?: string
  telefono?: string
  abonoInicial?: string
}

export type DatosAbono = {
  monto: number
  fecha: string
}

export type ErroresAbono = {
  monto?: string
  fecha?: string
}

type ResultadoFormulario<T> = { ok: true; datos: T } | { ok: false; errores: ErroresCliente }

export function normalizarCodigo(valor: string): string {
  return valor.trim().toLocaleUpperCase('es')
}

export function validarNuevoCliente(entrada: {
  codigo: string
  nombre: string
  telefono: string
  abonoInicial: string
}): ResultadoFormulario<DatosNuevoCliente> {
  const validacion = esquemaNuevo.safeParse(entrada)
  if (!validacion.success) return { ok: false, errores: erroresDe(validacion.error) }

  const abono = leerAbono(validacion.data.abonoInicial)
  if (!abono.ok) return { ok: false, errores: { abonoInicial: abono.mensaje } }

  return {
    ok: true,
    datos: {
      codigo: validacion.data.codigo,
      nombre: nombreListo(validacion.data.nombre),
      telefono: validacion.data.telefono,
      abonoInicial: abono.monto,
    },
  }
}

export function validarEdicionCliente(entrada: {
  codigo: string
  nombre: string
  telefono: string
}): ResultadoFormulario<DatosEdicionCliente> {
  const validacion = esquemaCliente.safeParse(entrada)
  if (!validacion.success) return { ok: false, errores: erroresDe(validacion.error) }

  return {
    ok: true,
    datos: {
      codigo: validacion.data.codigo,
      nombre: nombreListo(validacion.data.nombre),
      telefono: validacion.data.telefono,
    },
  }
}

const esquemaAbono = z
  .object({
    monto: z.string().trim(),
    fecha: z.string().trim(),
  })
  .superRefine((datos, ctx) => {
    if (!datos.monto) {
      ctx.addIssue({ code: 'custom', path: ['monto'], message: 'Escribe el abono.' })
    } else {
      const leido = leerAbono(datos.monto)
      if (!leido.ok) {
        ctx.addIssue({
          code: 'custom',
          path: ['monto'],
          message:
            leido.mensaje === 'El abono inicial debe ser mayor que 0.'
              ? 'El abono debe ser mayor que 0.'
              : leido.mensaje,
        })
      } else if (leido.monto == null) {
        ctx.addIssue({ code: 'custom', path: ['monto'], message: 'Escribe el abono.' })
      }
    }

    if (!fechaValida(datos.fecha)) {
      ctx.addIssue({ code: 'custom', path: ['fecha'], message: 'Elige una fecha válida.' })
    }
  })

export function validarAbono(entrada: {
  monto: string
  fecha: string
}): { ok: true; datos: DatosAbono } | { ok: false; errores: ErroresAbono } {
  const validacion = esquemaAbono.safeParse(entrada)
  if (!validacion.success) {
    const errores: ErroresAbono = {}
    for (const issue of validacion.error.issues) {
      const campo = issue.path[0]
      if ((campo === 'monto' || campo === 'fecha') && !errores[campo]) {
        errores[campo] = issue.message
      }
    }
    return { ok: false, errores }
  }

  const leido = leerAbono(validacion.data.monto)
  if (!leido.ok || leido.monto == null) {
    return { ok: false, errores: { monto: 'Escribe el abono.' } }
  }
  return { ok: true, datos: { monto: leido.monto, fecha: validacion.data.fecha } }
}

function fechaValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const local = new Date(anio, mes - 1, dia)
  return local.getFullYear() === anio && local.getMonth() === mes - 1 && local.getDate() === dia
}

function mensajeAbono(valor: string): string | null {
  const leido = leerAbono(valor)
  return leido.ok ? null : leido.mensaje
}

function leerAbono(
  valor: string,
): { ok: true; monto: number | null } | { ok: false; mensaje: string } {
  if (valor === '') return { ok: true, monto: null }

  const normalizado = valor.replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(normalizado)) {
    return { ok: false, mensaje: 'Escribe un abono válido.' }
  }
  if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) {
    return { ok: false, mensaje: 'Usa hasta 2 decimales.' }
  }

  const monto = redondear2(Number(normalizado))
  if (monto <= 0) return { ok: false, mensaje: 'El abono inicial debe ser mayor que 0.' }
  return { ok: true, monto }
}

/** Primera letra de cada palabra en mayúscula y el resto en minúscula: Joshua Lozada. */
export function capitalizarNombre(valor: string): string {
  const conservaEspacio = /\s$/.test(valor)
  const limpio = valor.trim().replace(/\s+/g, ' ')
  if (!limpio) return conservaEspacio ? ' ' : ''

  const listo = limpio
    .split(' ')
    .map((palabra) => palabra.split('-').map(capitalizarPalabra).join('-'))
    .join(' ')
  return conservaEspacio ? `${listo} ` : listo
}

function capitalizarPalabra(palabra: string): string {
  const minusculas = palabra.toLocaleLowerCase('es')
  const primera = minusculas.charAt(0)
  if (!primera) return ''
  return primera.toLocaleUpperCase('es') + minusculas.slice(1)
}

function nombreListo(valor: string): string | null {
  return capitalizarNombre(valor).trim() || null
}

function erroresDe(error: z.ZodError): ErroresCliente {
  const errores: ErroresCliente = {}
  for (const issue of error.issues) {
    const campo = issue.path[0]
    if (
      (campo === 'codigo' ||
        campo === 'nombre' ||
        campo === 'telefono' ||
        campo === 'abonoInicial') &&
      !errores[campo]
    ) {
      errores[campo] = issue.message
    }
  }
  return errores
}
