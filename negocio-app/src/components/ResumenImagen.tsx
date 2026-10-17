import type { CSSProperties } from 'react'
import { formatearDolares } from '../lib/dinero.ts'
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
}

const papel = '#ffffff'
const tinta = '#000000'
const textoAcento = '#49331F'
const textoIdentidad = '#49331F'
const fondoAcento = '#FBF3E7'
const textoVenta = '#A64E56'
const fondoVenta = '#FDF0F0'

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
}: Props) {
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
          <p style={{ ...caja, fontSize: 13 }}>{fecha}</p>
          <p
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
          {nombre ? (
            <p
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
          ) : null}
          {concepto ? (
            <p style={{ ...caja, color: textoAcento, marginTop: 8, fontSize: 14 }}>{concepto}</p>
          ) : null}
        </div>
        <LogoMarca
          variante="completo"
          estilo={{ display: 'block', width: 118, height: 'auto', flexShrink: 0 }}
        />
      </div>

      <Regla />

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

      <Regla />

      {concepto ? (
        <Linea
          etiqueta="Total de esta canasta"
          valor={formatearDolares(total)}
          fuerte
          resaltado
        />
      ) : (
        <>
          <Linea etiqueta="Total de la canasta" valor={formatearDolares(total)} />
          <Linea etiqueta="Abonado" valor={formatearDolares(abono)} />
          <Linea
            etiqueta="Saldo pendiente"
            valor={formatearDolares(saldo)}
            fuerte
            resaltado
            colorVenta
          />
        </>
      )}
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
