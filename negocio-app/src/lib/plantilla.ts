import { negocio } from '../config/negocio.ts'

const SEPARADOR = '\u2501'.repeat(12)
const FLORES = '\u{1F337}\u{1F495}'
const CARINO = '\u{1F970}'
const ICONO_BANCO = '\u{1F3E6}'
const ICONO_TITULAR = '\u{1F469}\u{200D}\u{1F4BC}'
const ICONO_CUENTA = '\u{1F4B3}'
const ICONO_NUMERO = '\u{1F522}'

export const CLAVES_FIJAS_MENSAJE = ['saludo', 'cuerpo', 'separador'] as const
export const CLAVES_IMAGEN = [
  'fecha',
  'codigo',
  'nombre',
  'concepto',
  'logo',
  'prendas',
  'total',
  'abono',
  'saldo',
] as const
export const PIEZAS_SALUDO = ['nombre', 'codigo'] as const

export type ClaveFijaMensaje = (typeof CLAVES_FIJAS_MENSAJE)[number]
export type ClaveImagen = (typeof CLAVES_IMAGEN)[number]
export type PiezaSaludo = (typeof PIEZAS_SALUDO)[number]
export type DireccionBloque = 'subir' | 'bajar'

export type Bloque<T extends string> = {
  clave: T
  visible: boolean
}

export type BloqueMensaje =
  | { tipo: 'fijo'; clave: ClaveFijaMensaje; visible: boolean }
  | { tipo: 'cuenta'; id: string; visible: boolean }

export type CuentaBancaria = {
  id: string
  banco: string
  nombreTitular: string
  tipoCuenta: string
  numeroCuenta: string
  cedula: string
}

export type SaludoArmado = {
  prefijo: string
  piezas: PiezaSaludo[]
  separador: string
  sufijo: string
}

export type PlantillaCompartir = {
  banco: string
  nombreTitular: string
  tipoCuenta: string
  numeroCuenta: string
  cedula: string
  saludoConNombre: string
  saludoSinNombre: string
  cuerpo: string
  cuentas: CuentaBancaria[]
  bloquesMensaje: BloqueMensaje[]
  bloquesImagen: Bloque<ClaveImagen>[]
}

export const ETIQUETAS_FIJAS_MENSAJE: Record<ClaveFijaMensaje, string> = {
  saludo: 'Saludo',
  cuerpo: 'Texto del pedido',
  separador: 'Línea de separación',
}

export const ETIQUETAS_IMAGEN: Record<ClaveImagen, string> = {
  fecha: 'Fecha',
  codigo: 'Código del cliente',
  nombre: 'Nombre del cliente',
  concepto: 'Aviso de esta venta',
  logo: 'Logo',
  prendas: 'Lista de prendas',
  total: 'Total',
  abono: 'Abonado',
  saldo: 'Saldo pendiente',
}

export const ETIQUETAS_PIEZA: Record<PiezaSaludo, string> = {
  nombre: 'Nombre',
  codigo: 'Código',
}

export const SALUDO_INICIAL: SaludoArmado = {
  prefijo: '\u00A1Hola! ',
  piezas: ['nombre', 'codigo'],
  separador: '-',
  sufijo: ` ${FLORES}`,
}

export function cuentaDesdeNegocio(id = 'principal'): CuentaBancaria {
  return {
    id,
    banco: negocio.banco,
    nombreTitular: negocio.nombreTitular,
    tipoCuenta: negocio.tipoCuenta,
    numeroCuenta: negocio.numeroCuenta,
    cedula: negocio.cedula,
  }
}

export function cuentaVacia(): CuentaBancaria {
  return {
    id: nuevaId(),
    banco: '',
    nombreTitular: '',
    tipoCuenta: '',
    numeroCuenta: '',
    cedula: '',
  }
}

export function nuevaId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `cuenta-${Date.now()}`
}

const cuentaInicial = cuentaDesdeNegocio()

export const PLANTILLA_INICIAL: PlantillaCompartir = {
  banco: cuentaInicial.banco,
  nombreTitular: cuentaInicial.nombreTitular,
  tipoCuenta: cuentaInicial.tipoCuenta,
  numeroCuenta: cuentaInicial.numeroCuenta,
  cedula: cuentaInicial.cedula,
  saludoConNombre: armarSaludo(SALUDO_INICIAL),
  saludoSinNombre: armarSaludo({ ...SALUDO_INICIAL, piezas: ['codigo'] }),
  cuerpo: `Le hago llegar el detalle de su pedido y el valor pendiente por cancelar. Muchas gracias por su comprita. ${CARINO}`,
  cuentas: [cuentaInicial],
  bloquesMensaje: [
    { tipo: 'fijo', clave: 'saludo', visible: true },
    { tipo: 'fijo', clave: 'cuerpo', visible: true },
    { tipo: 'fijo', clave: 'separador', visible: true },
    { tipo: 'cuenta', id: cuentaInicial.id, visible: true },
  ],
  bloquesImagen: CLAVES_IMAGEN.map((clave) => ({ clave, visible: true })),
}

export function copiarPlantilla(plantilla: PlantillaCompartir): PlantillaCompartir {
  return {
    ...plantilla,
    cuentas: plantilla.cuentas.map((cuenta) => ({ ...cuenta })),
    bloquesMensaje: plantilla.bloquesMensaje.map((bloque) => ({ ...bloque })),
    bloquesImagen: plantilla.bloquesImagen.map((bloque) => ({ ...bloque })),
  }
}

export function armarSaludo(armado: SaludoArmado): string {
  const medio = armado.piezas.map((pieza) => `{${pieza}}`).join(armado.separador)
  return `${armado.prefijo}${medio}${armado.sufijo}`
}

export function leerSaludo(texto: string): SaludoArmado {
  const coincidencias = [...texto.matchAll(/\{(nombre|codigo)\}/gi)]
  if (coincidencias.length === 0) {
    return { ...SALUDO_INICIAL, prefijo: texto, piezas: [], sufijo: '' }
  }

  const piezas: PiezaSaludo[] = []
  for (const coincidencia of coincidencias) {
    const pieza = coincidencia[1]?.toLowerCase()
    if (pieza === 'nombre' || pieza === 'codigo') {
      if (!piezas.includes(pieza)) piezas.push(pieza)
    }
  }

  const primera = coincidencias[0]
  const ultima = coincidencias[coincidencias.length - 1]
  if (!primera || !ultima || primera.index == null) return { ...SALUDO_INICIAL, piezas }

  const prefijo = texto.slice(0, primera.index)
  const finUltima = ultima.index + ultima[0].length
  const sufijo = texto.slice(finUltima)
  const separador =
    coincidencias.length >= 2 && primera.index != null && coincidencias[1]?.index != null
      ? texto.slice(primera.index + primera[0].length, coincidencias[1].index)
      : SALUDO_INICIAL.separador

  return { prefijo, piezas, separador, sufijo }
}

export function interpolar(texto: string, valores: { nombre: string; codigo: string }): string {
  let resultado = texto
  if (!valores.nombre.trim()) {
    resultado = resultado.replace(/\{nombre\}-?/gi, '').replace(/-?\{nombre\}/gi, '')
  }
  return resultado.replace(/\{(nombre|codigo)\}/gi, (_todo, clave: string) => {
    if (clave.toLowerCase() === 'nombre') return valores.nombre
    return valores.codigo
  })
}

export function completarBloques<T extends string>(claves: readonly T[], lista: unknown): Bloque<T>[] {
  const vistos = new Set<T>()
  const ordenados: Bloque<T>[] = []

  if (Array.isArray(lista)) {
    for (const item of lista) {
      if (!item || typeof item !== 'object' || !('clave' in item)) continue
      const clave = (item as { clave: unknown }).clave
      if (typeof clave !== 'string' || !claves.includes(clave as T) || vistos.has(clave as T)) continue
      vistos.add(clave as T)
      ordenados.push({
        clave: clave as T,
        visible: (item as { visible?: unknown }).visible !== false,
      })
    }
  }

  for (const clave of claves) {
    if (vistos.has(clave)) continue
    ordenados.push({ clave, visible: true })
  }

  return ordenados
}

export function idBloqueMensaje(bloque: BloqueMensaje): string {
  return bloque.tipo === 'fijo' ? `fijo:${bloque.clave}` : `cuenta:${bloque.id}`
}

export function completarCuentas(lista: unknown, respaldo: CuentaBancaria): CuentaBancaria[] {
  if (!Array.isArray(lista) || lista.length === 0) return [{ ...respaldo }]
  const cuentas: CuentaBancaria[] = []
  const vistos = new Set<string>()
  for (const item of lista) {
    if (!item || typeof item !== 'object') continue
    const fila = item as Record<string, unknown>
    const id = typeof fila.id === 'string' && fila.id.trim() !== '' ? fila.id : nuevaId()
    if (vistos.has(id)) continue
    vistos.add(id)
    cuentas.push({
      id,
      banco: typeof fila.banco === 'string' ? fila.banco : '',
      nombreTitular: typeof fila.nombreTitular === 'string' ? fila.nombreTitular : '',
      tipoCuenta: typeof fila.tipoCuenta === 'string' ? fila.tipoCuenta : '',
      numeroCuenta: typeof fila.numeroCuenta === 'string' ? fila.numeroCuenta : '',
      cedula: typeof fila.cedula === 'string' ? fila.cedula : '',
    })
  }
  return cuentas.length > 0 ? cuentas : [{ ...respaldo }]
}

export function completarBloquesMensaje(lista: unknown, cuentas: CuentaBancaria[]): BloqueMensaje[] {
  const idsCuenta = new Set(cuentas.map((cuenta) => cuenta.id))
  const vistos = new Set<string>()
  const ordenados: BloqueMensaje[] = []

  if (Array.isArray(lista)) {
    for (const item of lista) {
      if (!item || typeof item !== 'object') continue
      const fila = item as Record<string, unknown>
      if (fila.tipo === 'cuenta' || fila.clave === 'cuenta') {
        const id = typeof fila.id === 'string' ? fila.id : ''
        if (!idsCuenta.has(id) || vistos.has(`cuenta:${id}`)) continue
        vistos.add(`cuenta:${id}`)
        ordenados.push({ tipo: 'cuenta', id, visible: fila.visible !== false })
        continue
      }
      const claveAntigua = typeof fila.clave === 'string' ? fila.clave : ''
      if (claveAntigua === 'banco' || claveAntigua === 'titular' || claveAntigua === 'numero' || claveAntigua === 'cedula') {
        const primera = cuentas[0]
        if (!primera || vistos.has(`cuenta:${primera.id}`)) continue
        vistos.add(`cuenta:${primera.id}`)
        ordenados.push({ tipo: 'cuenta', id: primera.id, visible: fila.visible !== false })
        continue
      }
      if (fila.tipo === 'fijo' || CLAVES_FIJAS_MENSAJE.includes(claveAntigua as ClaveFijaMensaje)) {
        const clave = (fila.clave === 'saludo' || fila.clave === 'cuerpo' || fila.clave === 'separador'
          ? fila.clave
          : null) as ClaveFijaMensaje | null
        if (!clave || vistos.has(`fijo:${clave}`)) continue
        vistos.add(`fijo:${clave}`)
        ordenados.push({ tipo: 'fijo', clave, visible: fila.visible !== false })
      }
    }
  }

  for (const clave of CLAVES_FIJAS_MENSAJE) {
    if (vistos.has(`fijo:${clave}`)) continue
    ordenados.push({ tipo: 'fijo', clave, visible: true })
  }
  for (const cuenta of cuentas) {
    if (vistos.has(`cuenta:${cuenta.id}`)) continue
    ordenados.push({ tipo: 'cuenta', id: cuenta.id, visible: true })
  }
  return ordenados
}

type PlantillaEntrada = Omit<Partial<PlantillaCompartir>, 'bloquesMensaje' | 'bloquesImagen' | 'cuentas'> & {
  bloquesMensaje?: unknown
  bloquesImagen?: unknown
  cuentas?: unknown
}

export function normalizarPlantilla(entrada: PlantillaEntrada | null | undefined): PlantillaCompartir {
  const base = PLANTILLA_INICIAL
  const respaldoCuenta: CuentaBancaria = {
    id: 'principal',
    banco: textoO(entrada?.banco, base.banco),
    nombreTitular: textoO(entrada?.nombreTitular, base.nombreTitular),
    tipoCuenta: textoO(entrada?.tipoCuenta, base.tipoCuenta),
    numeroCuenta: textoO(entrada?.numeroCuenta, base.numeroCuenta),
    cedula: textoO(entrada?.cedula, base.cedula),
  }
  const cuentas = completarCuentas(entrada?.cuentas, respaldoCuenta)
  const primera = cuentas[0] ?? respaldoCuenta
  const saludoConNombre = textoO(entrada?.saludoConNombre, base.saludoConNombre)
  const armado = leerSaludo(saludoConNombre)
  return {
    banco: primera.banco,
    nombreTitular: primera.nombreTitular,
    tipoCuenta: primera.tipoCuenta,
    numeroCuenta: primera.numeroCuenta,
    cedula: primera.cedula,
    saludoConNombre,
    saludoSinNombre: armarSaludo({ ...armado, piezas: armado.piezas.filter((pieza) => pieza !== 'nombre') }),
    cuerpo: textoO(entrada?.cuerpo, base.cuerpo),
    cuentas,
    bloquesMensaje: completarBloquesMensaje(entrada?.bloquesMensaje, cuentas),
    bloquesImagen: completarBloques(CLAVES_IMAGEN, entrada?.bloquesImagen),
  }
}

function textoO(valor: string | undefined, respaldo: string): string {
  return typeof valor === 'string' ? valor : respaldo
}

export function alineadaConCuentas(plantilla: PlantillaCompartir): PlantillaCompartir {
  const primera = plantilla.cuentas[0]
  const armado = leerSaludo(plantilla.saludoConNombre)
  return {
    ...plantilla,
    banco: primera?.banco ?? '',
    nombreTitular: primera?.nombreTitular ?? '',
    tipoCuenta: primera?.tipoCuenta ?? '',
    numeroCuenta: primera?.numeroCuenta ?? '',
    cedula: primera?.cedula ?? '',
    saludoSinNombre: armarSaludo({ ...armado, piezas: armado.piezas.filter((pieza) => pieza !== 'nombre') }),
    bloquesMensaje: completarBloquesMensaje(plantilla.bloquesMensaje, plantilla.cuentas),
  }
}

export function reordenar<T>(lista: T[], desde: number, hacia: number): T[] {
  if (desde === hacia || desde < 0 || hacia < 0 || desde >= lista.length || hacia >= lista.length) {
    return lista.slice()
  }
  const copia = lista.slice()
  const [movido] = copia.splice(desde, 1)
  if (movido === undefined) return lista.slice()
  copia.splice(hacia, 0, movido)
  return copia
}

export function moverBloque<T extends string>(
  lista: Bloque<T>[],
  clave: T,
  direccion: DireccionBloque,
): Bloque<T>[] {
  const indice = lista.findIndex((bloque) => bloque.clave === clave)
  if (indice < 0) return lista.map((bloque) => ({ ...bloque }))

  const destino = direccion === 'subir' ? indice - 1 : indice + 1
  if (destino < 0 || destino >= lista.length) return lista.map((bloque) => ({ ...bloque }))

  const copia = lista.map((bloque) => ({ ...bloque }))
  const actual = copia[indice]
  const vecino = copia[destino]
  if (!actual || !vecino) return copia
  copia[indice] = vecino
  copia[destino] = actual
  return copia
}

export function alternarBloque<T extends string>(lista: Bloque<T>[], clave: T): Bloque<T>[] {
  return lista.map((bloque) =>
    bloque.clave === clave ? { ...bloque, visible: !bloque.visible } : { ...bloque },
  )
}

export function alternarBloqueMensaje(lista: BloqueMensaje[], id: string): BloqueMensaje[] {
  return lista.map((bloque) =>
    idBloqueMensaje(bloque) === id ? { ...bloque, visible: !bloque.visible } : { ...bloque },
  )
}

export function bloqueVisible<T extends string>(lista: Bloque<T>[], clave: T): boolean {
  return lista.find((bloque) => bloque.clave === clave)?.visible !== false
}

export function cuentaLista(cuenta: CuentaBancaria): boolean {
  return [cuenta.banco, cuenta.nombreTitular, cuenta.tipoCuenta, cuenta.numeroCuenta, cuenta.cedula].every(
    (valor) => valor.trim() !== '',
  )
}

export function datosBancariosListos(plantilla: PlantillaCompartir): boolean {
  const visibles = plantilla.bloquesMensaje.filter(
    (bloque): bloque is Extract<BloqueMensaje, { tipo: 'cuenta' }> => bloque.tipo === 'cuenta' && bloque.visible,
  )
  if (visibles.length === 0) return true
  return visibles.every((bloque) => {
    const cuenta = plantilla.cuentas.find((item) => item.id === bloque.id)
    return cuenta != null && cuentaLista(cuenta)
  })
}

function lineasCuenta(cuenta: CuentaBancaria): string[] {
  const lineas: string[] = []
  if (cuenta.banco.trim()) lineas.push(`${ICONO_BANCO} *${cuenta.banco.trim()}*`)
  if (cuenta.nombreTitular.trim()) lineas.push(`${ICONO_TITULAR} ${cuenta.nombreTitular.trim()}`)
  if (cuenta.tipoCuenta.trim()) lineas.push(`${ICONO_CUENTA} ${cuenta.tipoCuenta.trim()}`)
  if (cuenta.numeroCuenta.trim()) lineas.push(`${ICONO_NUMERO} ${cuenta.numeroCuenta.trim()}`)
  if (cuenta.cedula.trim()) lineas.push(`C\u00E9dula : ${cuenta.cedula.trim()}`)
  return lineas
}

export function textoWhatsApp(
  cliente: { nombre: string | null; codigo: string },
  plantilla: PlantillaCompartir,
): string {
  const codigo = cliente.codigo.trim().toLocaleUpperCase('es')
  const nombre = cliente.nombre?.trim() ?? ''
  const valores = { nombre, codigo }
  const saludo = interpolar(plantilla.saludoConNombre, valores)
  const lineas: string[] = []

  for (const bloque of plantilla.bloquesMensaje) {
    if (!bloque.visible) continue
    if (bloque.tipo === 'fijo') {
      if (bloque.clave === 'saludo') {
        if (saludo.trim() !== '') lineas.push(saludo)
        continue
      }
      if (bloque.clave === 'cuerpo') {
        const cuerpo = interpolar(plantilla.cuerpo, valores)
        if (cuerpo.trim() !== '') lineas.push(cuerpo)
        continue
      }
      lineas.push(SEPARADOR)
      continue
    }
    const cuenta = plantilla.cuentas.find((item) => item.id === bloque.id)
    if (!cuenta) continue
    lineas.push(...lineasCuenta(cuenta))
  }

  return lineas.filter((linea) => linea.trim() !== '').join('\n')
}

export const CLIENTE_EJEMPLO = { nombre: 'Ana', codigo: 'A1' } as const
