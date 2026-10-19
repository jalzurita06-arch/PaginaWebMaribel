import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { Eye, EyeOff, Trash } from 'lucide-react'
import { Aviso } from '../components/Aviso.tsx'
import { BotonAccion } from '../components/BotonAccion.tsx'
import { EditorSaludo } from '../components/EditorSaludo.tsx'
import { IndicadorCarga } from '../components/IndicadorCarga.tsx'
import { Layout } from '../components/Layout.tsx'
import { ListaArrastrable } from '../components/ListaArrastrable.tsx'
import { ResumenImagen } from '../components/ResumenImagen.tsx'
import { VistaRecibo } from '../components/VistaRecibo.tsx'
import { secciones } from '../config/secciones.ts'
import { useConexion } from '../context/useConexion.ts'
import { CLAVE_PLANTILLA, leerCache, pedirDatos, reemplazarCache } from '../lib/cacheLectura.ts'
import { formatearFechaRecibo } from '../lib/compartir.ts'
import { MENSAJE_FALLO_RED } from '../lib/conexion.ts'
import {
  alineadaConCuentas,
  normalizarPlantilla,
  alternarBloque,
  alternarBloqueMensaje,
  CLIENTE_EJEMPLO,
  copiarPlantilla,
  cuentaVacia,
  ETIQUETAS_FIJAS_MENSAJE,
  ETIQUETAS_IMAGEN,
  idBloqueMensaje,
  PLANTILLA_INICIAL,
  textoWhatsApp,
  type BloqueMensaje,
  type CuentaBancaria,
  type PlantillaCompartir,
} from '../lib/plantilla.ts'
import { guardarPlantilla, obtenerPlantilla } from '../services/plantilla.ts'

type MensajeEstado = { tipo: 'exito' | 'error'; texto: string }
type Panel = 'mensaje' | 'imagen'

const campo =
  'w-full rounded-3xl bg-fondo px-5 py-4 text-base outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black'

const EJEMPLO_GRUPOS = [
  { precio: 5, cantidad: 2, subtotal: 10 },
  { precio: 8, cantidad: 1, subtotal: 8 },
]

export function Mensaje() {
  const { nombre, subtitulo, acento } = secciones.mensaje
  const { enLinea } = useConexion()
  const [plantilla, setPlantilla] = useState<PlantillaCompartir | null>(() => {
    const guardada = leerCache<PlantillaCompartir>(CLAVE_PLANTILLA)
    return guardada ? normalizarPlantilla(guardada) : null
  })
  const [cargando, setCargando] = useState(() => leerCache<PlantillaCompartir>(CLAVE_PLANTILLA) == null)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<MensajeEstado | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [panel, setPanel] = useState<Panel>('mensaje')
  const [vistaImagen, setVistaImagen] = useState<'canasta' | 'venta'>('canasta')

  async function cargar() {
    if (!plantilla) setCargando(true)
    setErrorCarga(null)
    const resultado = await pedirDatos(CLAVE_PLANTILLA, obtenerPlantilla, { fresco: true })
    if (!resultado.ok) {
      if (leerCache<PlantillaCompartir>(CLAVE_PLANTILLA) == null) {
        setErrorCarga(resultado.mensaje)
        setPlantilla(null)
      }
    } else {
      setErrorCarga(null)
      setPlantilla(resultado.datos)
    }
    setCargando(false)
  }

  useEffect(() => {
    let activo = true
    void pedirDatos(CLAVE_PLANTILLA, obtenerPlantilla).then((resultado) => {
      if (!activo) return
      if (!resultado.ok) {
        if (leerCache<PlantillaCompartir>(CLAVE_PLANTILLA) == null) {
          setErrorCarga(resultado.mensaje)
          setPlantilla(null)
        }
      } else {
        setErrorCarga(null)
        setPlantilla(resultado.datos)
      }
      setCargando(false)
    })
    return () => {
      activo = false
    }
  }, [])

  function cambiar(cambio: (actual: PlantillaCompartir) => PlantillaCompartir) {
    setPlantilla((actual) => (actual ? alineadaConCuentas(cambio(actual)) : actual))
    setMensaje(null)
  }

  async function guardar() {
    if (!plantilla) return
    if (!enLinea) {
      setMensaje({ tipo: 'error', texto: MENSAJE_FALLO_RED })
      return
    }
    setOcupado(true)
    setMensaje(null)
    const resultado = await guardarPlantilla(alineadaConCuentas(plantilla))
    if (!resultado.ok) {
      setMensaje({ tipo: 'error', texto: resultado.mensaje })
      setOcupado(false)
      return
    }
    reemplazarCache(CLAVE_PLANTILLA, resultado.datos)
    setPlantilla(resultado.datos)
    setMensaje({
      tipo: 'exito',
      texto: panel === 'imagen' ? 'Imagen guardada. Así se comparte desde ahora.' : 'Mensaje guardado. Así se comparte desde ahora.',
    })
    setOcupado(false)
  }

  function restablecer() {
    setPlantilla(copiarPlantilla(PLANTILLA_INICIAL))
    setMensaje(null)
  }

  const vista = plantilla ?? PLANTILLA_INICIAL
  const texto = useMemo(() => textoWhatsApp(CLIENTE_EJEMPLO, vista), [vista])
  const esVenta = vistaImagen === 'venta'

  return (
    <Layout titulo={nombre} subtitulo={subtitulo} acento={acento}>
      <section className="flex flex-col gap-4 lg:gap-6">
        {mensaje?.tipo === 'exito' ? (
          <p role="status" className="rounded-3xl px-5 py-4 text-sm" style={{ backgroundColor: acento }}>
            {mensaje.texto}
          </p>
        ) : null}
        {mensaje?.tipo === 'error' ? <Aviso>{mensaje.texto}</Aviso> : null}

        {cargando && !plantilla ? <IndicadorCarga>Cargando mensaje…</IndicadorCarga> : null}

        {errorCarga ? (
          <div className="flex flex-col gap-3">
            <Aviso>{errorCarga}</Aviso>
            <BotonAccion variante="primario" disabled={ocupado} onClick={() => void cargar()}>
              Reintentar
            </BotonAccion>
          </div>
        ) : null}

        {!errorCarga && plantilla ? (
          <>
            <div className="grid grid-cols-2 gap-2 lg:max-w-md">
              <BotonAccion variante={panel === 'mensaje' ? 'primario' : 'suave'} onClick={() => setPanel('mensaje')}>
                Mensaje
              </BotonAccion>
              <BotonAccion variante={panel === 'imagen' ? 'primario' : 'suave'} onClick={() => setPanel('imagen')}>
                Imagen
              </BotonAccion>
            </div>

            {panel === 'mensaje' ? (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] lg:items-start lg:gap-8">
                <div className="order-2 flex flex-col gap-4 lg:order-1">
                  <Tarjeta titulo="Texto de WhatsApp">
                    <EditorSaludo
                      valor={plantilla.saludoConNombre}
                      ocupado={ocupado}
                      acento={acento}
                      onChange={(valor) => cambiar((actual) => ({ ...actual, saludoConNombre: valor }))}
                    />
                    <Campo
                      etiqueta="Texto del pedido"
                      valor={plantilla.cuerpo}
                      area
                      onChange={(valor) => cambiar((actual) => ({ ...actual, cuerpo: valor }))}
                    />
                  </Tarjeta>

                  <Tarjeta titulo="Cuentas">
                    <div className="flex flex-col gap-3">
                      {plantilla.cuentas.map((cuenta) => (
                        <FichaCuenta
                          key={cuenta.id}
                          cuenta={cuenta}
                          ocupado={ocupado}
                          onChange={(cambiada) =>
                            cambiar((actual) => ({
                              ...actual,
                              cuentas: actual.cuentas.map((item) => (item.id === cambiada.id ? cambiada : item)),
                            }))
                          }
                          onEliminar={() =>
                            cambiar((actual) => ({
                              ...actual,
                              cuentas: actual.cuentas.filter((item) => item.id !== cuenta.id),
                            }))
                          }
                        />
                      ))}
                    </div>
                    <BotonAccion
                      variante="suave"
                      disabled={ocupado}
                      onClick={() => cambiar((actual) => ({ ...actual, cuentas: [...actual.cuentas, cuentaVacia()] }))}
                    >
                      Agregar cuenta
                    </BotonAccion>
                  </Tarjeta>

                  <Tarjeta titulo="Qué sale y en qué orden">
                    <p className="text-sm leading-relaxed text-black/60">
                      Toma el mango de la izquierda y arrastra. Así decides qué va primero en el mensaje.
                    </p>
                    <ListaArrastrable
                      items={plantilla.bloquesMensaje}
                      idDe={idBloqueMensaje}
                      ocupado={ocupado}
                      onReorder={(bloquesMensaje) => cambiar((actual) => ({ ...actual, bloquesMensaje }))}
                      render={(bloque) => (
                        <FilaVisibilidad
                          etiqueta={etiquetaBloque(bloque, plantilla.cuentas)}
                          visible={bloque.visible}
                          ocupado={ocupado}
                          onAlternar={() =>
                            cambiar((actual) => ({
                              ...actual,
                              bloquesMensaje: alternarBloqueMensaje(actual.bloquesMensaje, idBloqueMensaje(bloque)),
                            }))
                          }
                        />
                      )}
                    />
                  </Tarjeta>
                  <Acciones ocupado={ocupado} enLinea={enLinea} onRestablecer={restablecer} onGuardar={() => void guardar()} />
                </div>
                <aside className="order-1 sticky top-4 z-20 flex max-h-[38dvh] flex-col self-start lg:order-2 lg:max-h-[calc(100dvh-10rem)]">
                  <Tarjeta titulo="Así se ve el mensaje" className="min-h-0 overflow-y-auto">
                    <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
                      {texto || 'No hay nada para mostrar. Activa al menos una parte.'}
                    </pre>
                  </Tarjeta>
                </aside>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] lg:items-start lg:gap-8">
                <div className="order-2 flex flex-col gap-4 lg:order-1">
                  <Tarjeta titulo="Qué sale en el recibo">
                    <p className="text-sm leading-relaxed text-black/60">
                      Arrastra para cambiar el orden. El logo, si se muestra, se queda arriba a la derecha. El aviso de esta venta y el abono solo aparecen cuando corresponde.
                    </p>
                    <ListaArrastrable
                      items={plantilla.bloquesImagen}
                      idDe={(bloque) => bloque.clave}
                      ocupado={ocupado}
                      onReorder={(bloquesImagen) => cambiar((actual) => ({ ...actual, bloquesImagen }))}
                      render={(bloque) => (
                        <FilaVisibilidad
                          etiqueta={ETIQUETAS_IMAGEN[bloque.clave]}
                          visible={bloque.visible}
                          ocupado={ocupado}
                          onAlternar={() =>
                            cambiar((actual) => ({
                              ...actual,
                              bloquesImagen: alternarBloque(actual.bloquesImagen, bloque.clave),
                            }))
                          }
                        />
                      )}
                    />
                  </Tarjeta>
                  <Acciones ocupado={ocupado} enLinea={enLinea} onRestablecer={restablecer} onGuardar={() => void guardar()} />
                </div>
                <aside className="order-1 sticky top-4 z-20 flex max-h-[38dvh] flex-col self-start lg:order-2 lg:h-[calc(100dvh-10rem)] lg:max-h-[calc(100dvh-10rem)]">
                  <Tarjeta titulo="Así se ve la imagen" className="min-h-0 flex-1 overflow-hidden">
                    <div className="grid grid-cols-2 gap-2">
                      <BotonAccion
                        variante={vistaImagen === 'canasta' ? 'primario' : 'suave'}
                        onClick={() => setVistaImagen('canasta')}
                      >
                        Canasta
                      </BotonAccion>
                      <BotonAccion
                        variante={vistaImagen === 'venta' ? 'primario' : 'suave'}
                        onClick={() => setVistaImagen('venta')}
                      >
                        Esta venta
                      </BotonAccion>
                    </div>
                    <div className="relative min-h-0 flex-1">
                    <VistaRecibo>
                      <ResumenImagen
                        codigo={CLIENTE_EJEMPLO.codigo}
                        nombre={CLIENTE_EJEMPLO.nombre}
                        fecha={formatearFechaRecibo(new Date())}
                        grupos={EJEMPLO_GRUPOS}
                        abono={5}
                        saldo={13}
                        total={18}
                        concepto={esVenta ? 'Esta venta' : undefined}
                        bloques={plantilla.bloquesImagen}
                      />
                    </VistaRecibo>
                    </div>
                  </Tarjeta>
                </aside>
              </div>
            )}
          </>
        ) : null}
      </section>
    </Layout>
  )
}

function Acciones({
  ocupado,
  enLinea,
  onRestablecer,
  onGuardar,
}: {
  ocupado: boolean
  enLinea: boolean
  onRestablecer: () => void
  onGuardar: () => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:max-w-xl">
      <BotonAccion variante="suave" disabled={ocupado} onClick={onRestablecer}>
        Volver al original
      </BotonAccion>
      <BotonAccion variante="primario" disabled={ocupado || !enLinea} onClick={onGuardar}>
        {ocupado ? 'Guardando…' : 'Guardar'}
      </BotonAccion>
    </div>
  )
}

function Tarjeta({ titulo, children, className = '' }: { titulo: string; children: ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm lg:p-8 ${className}`}>
      <h2 className="font-display text-2xl uppercase tracking-wide">{titulo}</h2>
      {children}
    </section>
  )
}

function Campo({
  etiqueta,
  valor,
  area = false,
  onChange,
}: {
  etiqueta: string
  valor: string
  area?: boolean
  onChange: (valor: string) => void
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm">
        {etiqueta}
      </label>
      {area ? (
        <textarea
          id={id}
          value={valor}
          rows={4}
          onChange={(evento) => onChange(evento.target.value)}
          className={`${campo} min-h-28 resize-y`}
        />
      ) : (
        <input id={id} value={valor} onChange={(evento) => onChange(evento.target.value)} className={campo} />
      )}
    </div>
  )
}

function FichaCuenta({
  cuenta,
  ocupado,
  onChange,
  onEliminar,
}: {
  cuenta: CuentaBancaria
  ocupado: boolean
  onChange: (cuenta: CuentaBancaria) => void
  onEliminar: () => void
}) {
  function campoDe(clave: keyof Omit<CuentaBancaria, 'id'>, etiqueta: string) {
    return (
      <Campo
        etiqueta={etiqueta}
        valor={cuenta[clave]}
        onChange={(valor) => onChange({ ...cuenta, [clave]: valor })}
      />
    )
  }

  return (
    <article className="flex flex-col gap-3 rounded-3xl bg-fondo p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm">{cuenta.banco.trim() || 'Cuenta nueva'}</p>
        <button
          type="button"
          aria-label="Eliminar cuenta"
          disabled={ocupado}
          onClick={onEliminar}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-white [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-40"
        >
          <Trash aria-hidden size={16} strokeWidth={2} />
        </button>
      </div>
      {campoDe('banco', 'Banco')}
      {campoDe('nombreTitular', 'Nombre de la cuenta')}
      {campoDe('tipoCuenta', 'Tipo de cuenta')}
      {campoDe('numeroCuenta', 'Número de cuenta')}
      {campoDe('cedula', 'Cédula')}
    </article>
  )
}

function FilaVisibilidad({
  etiqueta,
  visible,
  ocupado,
  onAlternar,
}: {
  etiqueta: string
  visible: boolean
  ocupado: boolean
  onAlternar: () => void
}) {
  return (
    <>
      <p className="min-w-0 flex-1 text-sm">{etiqueta}</p>
      <button
        type="button"
        aria-pressed={visible}
        aria-label={visible ? `Ocultar ${etiqueta}` : `Mostrar ${etiqueta}`}
        disabled={ocupado}
        onClick={onAlternar}
        className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-white px-3 text-sm [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50"
      >
        {visible ? <Eye aria-hidden size={16} strokeWidth={2} /> : <EyeOff aria-hidden size={16} strokeWidth={2} />}
        {visible ? 'Se muestra' : 'Oculto'}
      </button>
    </>
  )
}

function etiquetaBloque(bloque: BloqueMensaje, cuentas: CuentaBancaria[]): string {
  if (bloque.tipo === 'fijo') return ETIQUETAS_FIJAS_MENSAJE[bloque.clave]
  const cuenta = cuentas.find((item) => item.id === bloque.id)
  const nombre = cuenta?.banco.trim()
  return nombre ? `Cuenta ${nombre}` : 'Cuenta nueva'
}
