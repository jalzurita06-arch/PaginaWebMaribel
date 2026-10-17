import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  abrirChatWhatsApp,
  codificarVenta,
  datosBancariosListos,
  datosParaCompartir,
  esCelular,
  formatearFechaRecibo,
  leerVenta,
  nombreArchivoPedido,
  resumenPedido,
  telefonoConPrefijo,
  textoWhatsApp,
  urlWhatsApp,
  type DatosBancarios,
} from './compartir.ts'

const banco: DatosBancarios = {
  banco: 'Banco Pichincha',
  nombreTitular: 'Maribel Lozada Reyes',
  tipoCuenta: 'Cuenta de Ahorro',
  numeroCuenta: '2201156975',
  cedula: '1721965281',
}

const mensajeConNombre = `¡Hola! Ana-A1 🌷💕
Le hago llegar el detalle de su pedido y el valor pendiente por cancelar. Muchas gracias por su confianza. 🥰
━━━━━━━━━━━━
🏦 *Banco Pichincha*
👩‍💼 Maribel Lozada Reyes
💳 Cuenta de Ahorro
🔢 2201156975
Cédula : 1721965281`

describe('teléfono para WhatsApp', () => {
  it('quita el 0 inicial y antepone 593', () => {
    expect(telefonoConPrefijo('0998765432', '593')).toBe('593998765432')
  })

  it('no repite el prefijo si el número ya lo trae', () => {
    expect(telefonoConPrefijo('593998765432', '593')).toBe('593998765432')
    expect(telefonoConPrefijo('+593 99 876 5432', '593')).toBe('593998765432')
  })

  it('antepone el prefijo cuando no hay 0 ni prefijo', () => {
    expect(telefonoConPrefijo('998765432', '593')).toBe('593998765432')
  })

  it('deja vacío un teléfono sin dígitos útiles', () => {
    expect(telefonoConPrefijo('0', '593')).toBe('')
    expect(telefonoConPrefijo('abc', '593')).toBe('')
  })
})

describe('texto de WhatsApp', () => {
  it('arma el mensaje con nombre, código y datos del negocio', () => {
    expect(textoWhatsApp({ nombre: 'Ana', codigo: 'a1' }, banco)).toBe(mensajeConNombre)
  })

  it('usa solo el código cuando no hay nombre', () => {
    expect(textoWhatsApp({ nombre: null, codigo: 'B2' }, banco)).toContain('¡Hola! B2 🌷💕')
    expect(textoWhatsApp({ nombre: '   ', codigo: 'B2' }, banco)).toContain('¡Hola! B2 🌷💕')
    expect(textoWhatsApp({ nombre: null, codigo: 'B2' }, banco)).not.toContain('¡Hola! -')
  })

  it('toma el banco desde los datos, no un texto fijo', () => {
    expect(textoWhatsApp({ nombre: 'Ana', codigo: 'A1' }, { ...banco, banco: 'Otro banco' })).toContain(
      '🏦 *Otro banco*',
    )
  })

  it('exige los cinco datos bancarios', () => {
    expect(datosBancariosListos(banco)).toBe(true)
    expect(datosBancariosListos({ ...banco, cedula: '  ' })).toBe(false)
  })
})

describe('enlaces y archivo', () => {
  it('arma el chat del cliente en el celular, en la app y en WhatsApp Web', () => {
    expect(urlWhatsApp('celular', '59399', 'hola\nmundo')).toBe('https://wa.me/59399?text=hola%0Amundo')
    expect(urlWhatsApp('app', '59399', 'hola')).toBe('whatsapp://send?phone=59399&text=hola')
    expect(urlWhatsApp('web', '59399', 'a b')).toBe(
      'https://web.whatsapp.com/send?phone=59399&text=a%20b',
    )
  })

  it('deja los emojis del mensaje en UTF-8 dentro del enlace', () => {
    const url = urlWhatsApp('web', '59399', textoWhatsApp({ nombre: 'Ana', codigo: 'A1' }, banco))
    expect(url).toContain(encodeURIComponent('¡Hola!'))
    expect(url).toContain(encodeURIComponent('🌷💕'))
    expect(url).toContain(encodeURIComponent('🥰'))
    expect(url).toContain(encodeURIComponent('🏦'))
    expect(url).toContain(encodeURIComponent('👩‍💼'))
  })

  it('limpia el código para el nombre del archivo', () => {
    expect(nombreArchivoPedido('A 1')).toBe('pedido-A-1.png')
  })
})

describe('abrir chat de WhatsApp en PC', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reutiliza la misma pestaña y abre otra solo si la cerraron o el navegador la bloquea', () => {
    let href = ''
    let cerrada = false
    let abiertas = 0
    const pestaña = {
      get closed() {
        return cerrada
      },
      location: {
        get href() {
          return href
        },
        set href(valor: string) {
          href = valor
        },
      },
      focus: vi.fn(),
    }

    vi.stubGlobal('window', {
      open: (url: string, destino: string) => {
        expect(destino).toBe('_blank')
        expect(url).not.toContain('about:blank')
        abiertas += 1
        href = url
        return pestaña
      },
    })

    const primero = abrirChatWhatsApp('59399', 'cliente A', false)
    expect(primero.bloqueada).toBe(false)
    expect(abiertas).toBe(1)

    const segundo = abrirChatWhatsApp('59388', 'cliente B', false)
    expect(segundo.bloqueada).toBe(false)
    expect(abiertas).toBe(1)
    expect(href).toBe(urlWhatsApp('web', '59388', 'cliente B'))

    cerrada = true
    const tercero = abrirChatWhatsApp('59377', 'cliente C', false)
    expect(tercero.bloqueada).toBe(false)
    expect(abiertas).toBe(2)

    cerrada = true
    vi.stubGlobal('window', { open: () => null })
    const bloqueada = abrirChatWhatsApp('59366', 'cliente D', false)
    expect(bloqueada.bloqueada).toBe(true)
    expect(bloqueada.url).toBe(urlWhatsApp('web', '59366', 'cliente D'))
  })
})

describe('resumen del pedido', () => {
  it('agrupa por precio, ordena y calcula abono, saldo y total sin tocar los ítems', () => {
    const items = [
      { precio: 9, cantidad: 2 },
      { precio: 5, cantidad: 1 },
      { precio: 5, cantidad: 2 },
    ]

    expect(resumenPedido(items, 5)).toEqual({
      grupos: [
        { precio: 5, cantidad: 3, subtotal: 15 },
        { precio: 9, cantidad: 2, subtotal: 18 },
      ],
      total: 33,
      abono: 5,
      saldo: 28,
    })
    expect(items).toEqual([
      { precio: 9, cantidad: 2 },
      { precio: 5, cantidad: 1 },
      { precio: 5, cantidad: 2 },
    ])
  })

  it('escribe la fecha del día en español', () => {
    expect(formatearFechaRecibo(new Date(2026, 9, 14))).toBe('14 de octubre de 2026')
  })
})

describe('venta para compartir', () => {
  it('guarda y lee solo las prendas de esa venta', () => {
    const items = [
      { precio: 5, cantidad: 2 },
      { precio: 3.5, cantidad: 1 },
    ]
    expect(leerVenta(codificarVenta(items))).toEqual([
      { precio: 5, cantidad: 2 },
      { precio: 3.5, cantidad: 1 },
    ])
  })

  it('rechaza un texto que no es una venta', () => {
    expect(leerVenta('')).toBeNull()
    expect(leerVenta('5')).toBeNull()
    expect(leerVenta('0x2')).toBeNull()
    expect(leerVenta('5x0')).toBeNull()
  })
})

describe('datos para compartir en el celular', () => {
  const archivo = new File([Uint8Array.from([1, 2, 3])], 'pedido.jpg', { type: 'image/jpeg' })

  it('manda la imagen y el mensaje cuando el celular acepta los dos', () => {
    expect(datosParaCompartir(archivo, 'hola', () => true)).toEqual({ files: [archivo], text: 'hola' })
  })

  it('manda solo la imagen si el mensaje haría que se rechace el archivo', () => {
    expect(datosParaCompartir(archivo, 'hola', (datos) => datos.text == null)).toEqual({ files: [archivo] })
  })

  it('no arma datos si el celular no puede compartir archivos', () => {
    expect(datosParaCompartir(archivo, 'hola', () => false)).toBeNull()
  })

  it('sigue con la imagen si preguntar por el mensaje falla', () => {
    const datos = datosParaCompartir(archivo, 'hola', (dato) => {
      if (dato.text) throw new Error('no')
      return true
    })
    expect(datos).toEqual({ files: [archivo] })
  })
})

describe('dispositivo', () => {
  it('trata Android, iPhone y iPad como celular', () => {
    expect(
      esCelular('Mozilla/5.0 (Linux; Android 13; 2201117TG) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36'),
    ).toBe(true)
    expect(esCelular('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true)
    expect(
      esCelular('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', {
        plataforma: 'MacIntel',
        puntosTactiles: 5,
      }),
    ).toBe(true)
  })

  it('trata Windows como computadora', () => {
    expect(
      esCelular('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', {
        plataforma: 'Win32',
        puntosTactiles: 0,
      }),
    ).toBe(false)
  })
})
