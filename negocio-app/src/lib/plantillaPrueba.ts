import {
  alineadaConCuentas,
  PLANTILLA_INICIAL,
  type CuentaBancaria,
  type PlantillaCompartir,
} from './plantilla.ts'

/** Datos ficticios. No son una cuenta real. */
export const CUENTA_DE_PRUEBA: CuentaBancaria = {
  id: 'principal',
  banco: 'Banco Ejemplo',
  nombreTitular: 'Titular de Prueba',
  tipoCuenta: 'Cuenta de Ahorro',
  numeroCuenta: '0001112223',
  cedula: '0102030405',
}

export function plantillaDePrueba(): PlantillaCompartir {
  const cuenta = { ...CUENTA_DE_PRUEBA }
  return alineadaConCuentas({
    ...PLANTILLA_INICIAL,
    banco: cuenta.banco,
    nombreTitular: cuenta.nombreTitular,
    tipoCuenta: cuenta.tipoCuenta,
    numeroCuenta: cuenta.numeroCuenta,
    cedula: cuenta.cedula,
    cuentas: [cuenta],
  })
}
