import type { CSSProperties } from 'react'
import { formatearDolares } from '../lib/dinero.ts'
import { bloqueVisible, PLANTILLA_INICIAL, type Bloque, type ClaveImagen } from '../lib/plantilla.ts'
import type { GrupoPrecio } from '../lib/reglas.ts'
import { LogoMarca } from './LogoMarca.tsx'

type Props = {
  codigo: string
  nombre: string | null
  fecha: string
  grupos: GrupoPrecio[]
  abono: number
  saldo: number
  total: number
  concepto?: string
  bloques?: Bloque<ClaveImagen>[]
}

const papel = '#ffffff'
const tinta = '#000000'
const textoAcento = '#49331F'
const textoIdentidad = '#49331F'
const fondoAcento = '#FBF3E7'
const textoVenta = '#A64E56'
const fondoVenta = '#FDF0F0'
const IDENTIDAD = new Set<ClaveImagen>(['fecha', 'codigo', 'nombre', 'concepto'])

const caja: CSSProperties = {
  boxSizing: 'border-box',
  margin: 0,
  padding: 0,
  color: tinta,
  backgroundColor: 'transparent',
  borderStyle: 'solid',
  borderWidth: 0,
  borderColor: tinta,
  boxShadow: 'none',
  fontFamily: 'Inter, "Segoe UI", sans-serif',
  fontVariantNumeric: 'tabular-nums',
}

export function ResumenImagen({
  codigo,
  nombre,
  fecha,
  grupos,
  abono,
  saldo,
  total,
  concepto,
  bloques = PLANTILLA_INICIAL.bloquesImagen,
}: Props) {
  const esVenta = Boolean(concepto)
  const muestra = (clave: ClaveImagen) => {
    if (!bloqueVisible(bloques, clave)) return false
    if (clave === 'concepto') return esVenta
    if (clave === 'nombre') return Boolean(nombre)
    if (clave === 'abono' || clave === 'saldo') return !esVenta
    return true
  }

  const cuerpo = bloques.filter((bloque) => !IDENTIDAD.has(bloque.clave) && bloque.clave !== 'logo' && muestra(bloque.clave))
  const hayEncabezado = bloques.some((bloque) => IDENTIDAD.has(bloque.clave) && muestra(bloque.clave)) || muestra('logo')
  const hayCuerpo = cuerpo.length > 0
  const hayMontos = cuerpo.some((bloque) => bloque.clave !== 'prendas')

  return (
    <article
      style={{
        ...caja,
        width: 360,
        padding: '28px 28px 36px',
        backgroundColor: papel,
        fontSize: 15,
        lineHeight: 1.35,
        textAlign: 'left',
      }}
    >
      {hayEncabezado ? (
        <div
          style={{
            ...caja,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div style={{ ...caja, minWidth: 0, flex: '1 1 auto' }}>
            {bloques.map((bloque) => {
              if (!IDENTIDAD.has(bloque.clave) || !muestra(bloque.clave)) return null
              if (bloque.clave === 'fecha') {
                return (
                  <p key="fecha" style={{ ...caja, fontSize: 13 }}>
                    {fecha}
                  </p>
                )
              }
              if (bloque.clave === 'codigo') {
                return (
                  <p
                    key="codigo"
                    style={{
                      ...caja,
                      color: textoIdentidad,
                      marginTop: 16,
                      fontSize: 26,
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      lineHeight: 1.1,
                      wordBreak: 'break-word',
                    }}
                  >
                    {codigo}
                  </p>
                )
              }
              if (bloque.clave === 'nombre' && nombre) {
                return (
                  <p
                    key="nombre"
                    style={{
                      ...caja,
                      color: textoIdentidad,
                      marginTop: 6,
                      fontSize: 16,
                      wordBreak: 'break-word',
                    }}
                  >
                    {nombre}
                  </p>
                )
              }
              if (bloque.clave === 'concepto' && concepto) {
                return (
                  <p key="concepto" style={{ ...caja, color: textoAcento, marginTop: 8, fontSize: 14 }}>
                    {concepto}
                  </p>
                )
              }
              return null
            })}
          </div>
          {muestra('logo') ? (
            <LogoMarca
              variante="completo"
              estilo={{ display: 'block', width: 118, height: 'auto', flexShrink: 0 }}
            />
          ) : null}
        </div>
      ) : null}

      {hayEncabezado && hayCuerpo ? <Regla /> : null}

      {cuerpo.map((bloque, indice) => {
        if (bloque.clave === 'prendas') {
          return (
            <div key="prendas" style={caja}>
              {indice > 0 ? <Regla /> : null}
              {grupos.length === 0 ? (
                <p style={{ ...caja, fontSize: 15 }}>Sin prendas</p>
              ) : (
                <div style={caja}>
                  <Fila prendas="Cant. prendas" precio="Precio" subtotal="Subtotal" encabezado />
                  {grupos.map((grupo) => (
                    <Fila
                      key={grupo.precio}
                      prendas={String(grupo.cantidad)}
                      precio={formatearDolares(grupo.precio)}
                      subtotal={formatearDolares(grupo.subtotal)}
                    />
                  ))}
                </div>
              )}
              {hayMontos ? <Regla /> : null}
            </div>
          )
        }
        if (bloque.clave === 'total') {
          return esVenta ? (
            <Linea
              key="total"
              etiqueta="Total de esta canasta"
              valor={formatearDolares(total)}
              fuerte
              resaltado
            />
          ) : (
            <Linea key="total" etiqueta="Total de la canasta" valor={formatearDolares(total)} />
          )
        }
        if (bloque.clave === 'abono') {
          return <Linea key="abono" etiqueta="Abonado" valor={formatearDolares(abono)} />
        }
        if (bloque.clave === 'saldo') {
          return (
            <Linea
              key="saldo"
              etiqueta="Saldo pendiente"
              valor={formatearDolares(saldo)}
              fuerte
              resaltado
              colorVenta
            />
          )
        }
        return null
      })}
    </article>
  )
}

function Regla() {
  return <div style={{ ...caja, height: 1, margin: '16px 0', backgroundColor: tinta }} />
}

function Fila({
  prendas,
  precio,
  subtotal,
  encabezado = false,
}: {
  prendas: string
  precio: string
  subtotal: string
  encabezado?: boolean
}) {
  return (
    <div
      style={{
        ...caja,
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr 1fr',
        columnGap: 8,
        marginTop: encabezado ? 0 : 8,
        fontSize: encabezado ? 13 : 15,
        fontWeight: encabezado ? 600 : 400,
      }}
    >
      <span style={{ ...caja, color: encabezado ? textoAcento : tinta }}>{prendas}</span>
      <span style={{ ...caja, color: encabezado ? textoAcento : tinta, textAlign: 'right' }}>
        {precio}
      </span>
      <span style={{ ...caja, color: encabezado ? textoAcento : tinta, textAlign: 'right' }}>
        {subtotal}
      </span>
    </div>
  )
}

function Linea({
  etiqueta,
  valor,
  fuerte = false,
  resaltado = false,
  colorVenta = false,
}: {
  etiqueta: string
  valor: string
  fuerte?: boolean
  resaltado?: boolean
  colorVenta?: boolean
}) {
  return (
    <div
      style={{
        ...caja,
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        marginTop: resaltado ? 12 : fuerte ? 10 : 6,
        padding: resaltado ? '10px 12px' : 0,
        borderRadius: resaltado ? 10 : 0,
        backgroundColor: resaltado ? (colorVenta ? fondoVenta : fondoAcento) : 'transparent',
        fontSize: fuerte ? 18 : 15,
        fontWeight: resaltado ? 700 : fuerte ? 600 : 400,
      }}
    >
      <span style={{ ...caja, color: colorVenta ? textoVenta : resaltado ? textoAcento : tinta }}>
        {etiqueta}
      </span>
      <span style={{ ...caja, color: colorVenta ? textoVenta : resaltado ? textoAcento : tinta }}>
        {valor}
      </span>
    </div>
  )
}
