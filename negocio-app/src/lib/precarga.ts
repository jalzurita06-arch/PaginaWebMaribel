import {
  CLAVE_ABONOS_CANASTA,
  CLAVE_CANASTAS,
  CLAVE_CLIENTES,
  CLAVE_ENVIOS,
  CLAVE_FECHAS_ABONO,
  CLAVE_PLANTILLA,
  CLAVE_PRECIOS,
  CLAVE_RESUMEN_ABONOS,
  pedirDatos,
  reemplazarCache,
} from './cacheLectura.ts'
import {
  clientesVentaDe,
  listarClientesConItems,
  listarTodosLosAbonos,
  resumenAbonosDe,
} from '../services/clientes.ts'
import { canastasDesdeClientesConItems, listarEnviosSemana } from '../services/envios.ts'
import { obtenerPlantilla } from '../services/plantilla.ts'
import { listarPrecios } from '../services/precios.ts'

/**
 * Pide las listas en cuanto hay sesión, para que al abrir una sección ya estén.
 * Clientes, canastas y resumen salen de un solo viaje; los abonos, de otro.
 * Con red lenta van de a bloques, para no pelearse con la pantalla que se está viendo.
 */
export function precargarDatos(lenta: boolean): void {
  const tareas = [
    precargarClientesYCanastas,
    precargarAbonos,
    () => pedirDatos(CLAVE_PRECIOS, () => listarPrecios()),
    () => pedirDatos(CLAVE_ENVIOS, () => listarEnviosSemana()),
    () => pedirDatos(CLAVE_PLANTILLA, () => obtenerPlantilla()),
  ]

  if (lenta) {
    void enSerie(tareas)
    return
  }

  void Promise.all(tareas.map((tarea) => tarea().then(() => undefined, () => undefined)))
}

async function precargarClientesYCanastas(): Promise<void> {
  const filas = await listarClientesConItems()
  if (!filas.ok) return
  reemplazarCache(CLAVE_CLIENTES, clientesVentaDe(filas.datos))
  reemplazarCache(CLAVE_RESUMEN_ABONOS, resumenAbonosDe(filas.datos))
  reemplazarCache(CLAVE_CANASTAS, canastasDesdeClientesConItems(filas.datos))
}

async function precargarAbonos(): Promise<void> {
  const abonos = await listarTodosLosAbonos()
  if (!abonos.ok) return
  reemplazarCache(CLAVE_FECHAS_ABONO, abonos.datos.fechas)
  reemplazarCache(CLAVE_ABONOS_CANASTA, abonos.datos.porCliente)
}

async function enSerie(tareas: Array<() => Promise<unknown>>) {
  for (const tarea of tareas) {
    try {
      await tarea()
    } catch {
      // Si una lista falla, la pantalla que la abre muestra el aviso.
    }
  }
}
