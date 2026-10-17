import { describe, expect, it } from 'vitest'
import {
  capitalizarNombre,
  validarAbono,
  validarEdicionCliente,
  validarNuevoCliente,
} from './clienteFormulario.ts'

const vacio = { codigo: '', nombre: '', telefono: '', abonoInicial: '' }

describe('validarNuevoCliente', () => {
  it('acepta código, teléfono y un abono inicial', () => {
    expect(
      validarNuevoCliente({
        codigo: '  a12  ',
        nombre: '  ANA  ',
        telefono: '0991234567',
        abonoInicial: '5,5',
      }),
    ).toEqual({
      ok: true,
      datos: {
        codigo: 'A12',
        nombre: 'Ana',
        telefono: '0991234567',
        abonoInicial: 5.5,
      },
    })
  })

  it('guarda el nombre con cada palabra capitalizada', () => {
    expect(
      validarNuevoCliente({
        codigo: 'K34',
        nombre: 'joshua lozada',
        telefono: '0991234567',
        abonoInicial: '',
      }),
    ).toEqual({
      ok: true,
      datos: {
        codigo: 'K34',
        nombre: 'Joshua Lozada',
        telefono: '0991234567',
        abonoInicial: null,
      },
    })
  })

  it('deja el nombre y el abono vacíos en nulo', () => {
    expect(
      validarNuevoCliente({
        codigo: 'B1',
        nombre: '   ',
        telefono: '0991234567',
        abonoInicial: '',
      }),
    ).toEqual({
      ok: true,
      datos: {
        codigo: 'B1',
        nombre: null,
        telefono: '0991234567',
        abonoInicial: null,
      },
    })
  })

  it('exige un teléfono de 10 dígitos', () => {
    expect(validarNuevoCliente({ ...vacio, codigo: 'C1', telefono: '099123456', abonoInicial: '' })).toEqual({
      ok: false,
      errores: { telefono: 'El teléfono debe tener 10 dígitos.' },
    })
    expect(validarNuevoCliente({ ...vacio, codigo: 'C1', telefono: '09912345678', abonoInicial: '' })).toEqual({
      ok: false,
      errores: { telefono: 'El teléfono debe tener 10 dígitos.' },
    })
  })

  it('pide código, teléfono numérico y un abono mayor que 0', () => {
    expect(validarNuevoCliente({ ...vacio, telefono: '099-1', abonoInicial: '0' })).toEqual({
      ok: false,
      errores: {
        codigo: 'Escribe el código.',
        telefono: 'El teléfono solo puede tener números.',
        abonoInicial: 'El abono inicial debe ser mayor que 0.',
      },
    })
  })

  it('rechaza un abono con más de 2 decimales o con letras', () => {
    expect(validarNuevoCliente({ ...vacio, codigo: 'C1', telefono: '0991234567', abonoInicial: '5.555' })).toEqual(
      {
        ok: false,
        errores: { abonoInicial: 'Usa hasta 2 decimales.' },
      },
    )
    expect(validarNuevoCliente({ ...vacio, codigo: 'C1', telefono: '0991234567', abonoInicial: 'cinco' })).toEqual(
      {
        ok: false,
        errores: { abonoInicial: 'Escribe un abono válido.' },
      },
    )
  })
})

describe('validarAbono', () => {
  it('acepta un monto mayor que 0 y una fecha', () => {
    expect(validarAbono({ monto: '5,5', fecha: '2026-10-14' })).toEqual({
      ok: true,
      datos: { monto: 5.5, fecha: '2026-10-14' },
    })
  })

  it('pide el monto y una fecha real', () => {
    expect(validarAbono({ monto: '', fecha: '2026-02-31' })).toEqual({
      ok: false,
      errores: {
        monto: 'Escribe el abono.',
        fecha: 'Elige una fecha válida.',
      },
    })
  })

  it('rechaza un abono de 0', () => {
    expect(validarAbono({ monto: '0', fecha: '2026-10-14' })).toEqual({
      ok: false,
      errores: { monto: 'El abono debe ser mayor que 0.' },
    })
  })
})

describe('capitalizarNombre', () => {
  it('deja la primera letra de cada palabra en mayúscula', () => {
    expect(capitalizarNombre('joshua')).toBe('Joshua')
    expect(capitalizarNombre('JOSHUA LOZADA')).toBe('Joshua Lozada')
    expect(capitalizarNombre('  joshua   lozada  ')).toBe('Joshua Lozada ')
    expect(capitalizarNombre('maría-josé ñuñez')).toBe('María-José Ñuñez')
  })
})

describe('validarEdicionCliente', () => {
  it('no pide abono y permite borrar el nombre', () => {
    expect(validarEdicionCliente({ codigo: 'a12', nombre: '', telefono: '0991234567' })).toEqual({
      ok: true,
      datos: { codigo: 'A12', nombre: null, telefono: '0991234567' },
    })
  })

  it('exige un teléfono de 10 dígitos', () => {
    expect(validarEdicionCliente({ codigo: 'A12', nombre: '', telefono: '099123456' })).toEqual({
      ok: false,
      errores: { telefono: 'El teléfono debe tener 10 dígitos.' },
    })
  })
})
