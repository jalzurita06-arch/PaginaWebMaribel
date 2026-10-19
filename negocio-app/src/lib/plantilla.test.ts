import { describe, expect, it } from 'vitest'
import {
  alineadaConCuentas,
  alternarBloqueMensaje,
  armarSaludo,
  completarBloques,
  completarBloquesMensaje,
  copiarPlantilla,
  datosBancariosListos,
  idBloqueMensaje,
  interpolar,
  leerSaludo,
  PLANTILLA_INICIAL,
  reordenar,
  SALUDO_INICIAL,
  textoWhatsApp,
} from './plantilla.ts'

const mensajePorDefecto = `¡Hola! Ana-A1 🌷💕
Le hago llegar el detalle de su pedido y el valor pendiente por cancelar. Muchas gracias por su comprita. 🥰
━━━━━━━━━━━━
🏦 *Banco Pichincha*
👩‍💼 Maribel Lozada Reyes
💳 Cuenta de Ahorro
🔢 2201156975
Cédula : 1721965281`

describe('plantilla del mensaje', () => {
  it('arma el mensaje con el orden y los textos iniciales', () => {
    expect(textoWhatsApp({ nombre: 'Ana', codigo: 'a1' }, PLANTILLA_INICIAL)).toBe(mensajePorDefecto)
  })

  it('usa el saludo sin nombre cuando no hay nombre', () => {
    expect(textoWhatsApp({ nombre: null, codigo: 'B2' }, PLANTILLA_INICIAL)).toContain('¡Hola! B2 🌷💕')
    expect(textoWhatsApp({ nombre: '   ', codigo: 'B2' }, PLANTILLA_INICIAL)).toContain('¡Hola! B2 🌷💕')
    expect(textoWhatsApp({ nombre: null, codigo: 'B2' }, PLANTILLA_INICIAL)).not.toContain('¡Hola! -')
  })

  it('cambia {nombre} y {codigo} en el texto', () => {
    expect(interpolar('Hola {nombre} {codigo}', { nombre: 'Ana', codigo: 'A1' })).toBe('Hola Ana A1')
  })

  it('lee y arma el saludo con pastillas', () => {
    expect(leerSaludo(PLANTILLA_INICIAL.saludoConNombre)).toEqual(SALUDO_INICIAL)
    expect(armarSaludo({ ...SALUDO_INICIAL, piezas: ['codigo', 'nombre'] })).toBe('¡Hola! {codigo}-{nombre} 🌷💕')
  })

  it('omite un bloque oculto y respeta el orden', () => {
    const plantilla = copiarPlantilla(PLANTILLA_INICIAL)
    const idCuerpo = idBloqueMensaje({ tipo: 'fijo', clave: 'cuerpo', visible: true })
    const idCuenta = idBloqueMensaje({ tipo: 'cuenta', id: 'principal', visible: true })
    plantilla.bloquesMensaje = alternarBloqueMensaje(plantilla.bloquesMensaje, idCuerpo)
    const indiceCuenta = plantilla.bloquesMensaje.findIndex((bloque) => idBloqueMensaje(bloque) === idCuenta)
    plantilla.bloquesMensaje = reordenar(plantilla.bloquesMensaje, indiceCuenta, 1)
    const texto = textoWhatsApp({ nombre: 'Ana', codigo: 'A1' }, plantilla)
    expect(texto).not.toContain('Le hago llegar')
    expect(texto.indexOf('Banco Pichincha')).toBeGreaterThan(-1)
    expect(texto.indexOf('Banco Pichincha')).toBeLessThan(texto.indexOf('━━━━'))
  })

  it('completa bloques que faltan y descarta claves raras', () => {
    const bloques = completarBloques(['saludo', 'cuerpo'] as const, [{ clave: 'cuerpo', visible: false }, { clave: 'otro' }])
    expect(bloques).toEqual([
      { clave: 'cuerpo', visible: false },
      { clave: 'saludo', visible: true },
    ])
  })

  it('migra el orden viejo a una cuenta', () => {
    const bloques = completarBloquesMensaje(
      [
        { clave: 'saludo', visible: true },
        { clave: 'banco', visible: true },
        { clave: 'cuerpo', visible: true },
      ],
      [{ id: 'principal', banco: 'A', nombreTitular: 'B', tipoCuenta: 'C', numeroCuenta: '1', cedula: '2' }],
    )
    expect(bloques.map((bloque) => (bloque.tipo === 'fijo' ? bloque.clave : bloque.id))).toEqual([
      'saludo',
      'principal',
      'cuerpo',
      'separador',
    ])
  })

  it('pide los datos bancarios solo si se van a mostrar', () => {
    expect(datosBancariosListos(PLANTILLA_INICIAL)).toBe(true)
    const incompleta = copiarPlantilla(PLANTILLA_INICIAL)
    const primera = incompleta.cuentas[0]
    if (primera) primera.cedula = '  '
    expect(datosBancariosListos(incompleta)).toBe(false)
    incompleta.bloquesMensaje = alternarBloqueMensaje(incompleta.bloquesMensaje, 'cuenta:principal')
    expect(datosBancariosListos(incompleta)).toBe(true)
  })

  it('pone dos cuentas en el mensaje', () => {
    const plantilla = copiarPlantilla(PLANTILLA_INICIAL)
    plantilla.cuentas.push({
      id: 'otra',
      banco: 'Banco Guayaquil',
      nombreTitular: 'Otra',
      tipoCuenta: 'Corriente',
      numeroCuenta: '99',
      cedula: '11',
    })
    const lista = alineadaConCuentas(plantilla)
    const texto = textoWhatsApp({ nombre: 'Ana', codigo: 'A1' }, lista)
    expect(texto).toContain('Banco Pichincha')
    expect(texto).toContain('Banco Guayaquil')
  })
})
