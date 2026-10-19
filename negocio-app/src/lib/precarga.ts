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
} from './cacheLectura.ts'
import { listarFechasAbono, listarAbonosDeClientes, listarClientes, listarResumenAbonos } from '../services/clientes.ts'
import { listarCanastasAbiertas, listarEnviosSemana } from '../services/envios.ts'
import { obtenerPlantilla } from '../services/plantilla.ts'
import { listarPrecios } from '../services/precios.ts'

/**
 * Pide las listas en cuanto hay sesión, para que al abrir una sección ya estén.
 * Con red lenta van de una en una, para no pelearse con la pantalla que se está viendo.
 */
export function precargarDatos(lenta: boolean): void {
  const tareas = [
    () => pedirDatos(CLAVE_CLIENTES, () => listarClientes()),
    () => pedirDatos(CLAVE_PRECIOS, () => listarPrecios()),
    () => pedirDatos(CLAVE_RESUMEN_ABONOS, () => listarResumenAbonos()),
    () => pedirDatos(CLAVE_FECHAS_ABONO, () => listarFechasAbono()),
    async () => {
      const resultado = await pedirDatos(CLAVE_CANASTAS, () => listarCanastasAbiertas())
      if (!resultado.ok || resultado.datos.length === 0) return
      await pedirDatos(
        CLAVE_ABONOS_CANASTA,
        () => listarAbonosDeClientes(resultado.datos.map((canasta) => canasta.clienteId)),
        { fresco: true },
      )
    },
    () => pedirDatos(CLAVE_ENVIOS, () => listarEnviosSemana()),
    () => pedirDatos(CLAVE_PLANTILLA, () => obtenerPlantilla()),
  ]

  if (lenta) {
    void enSerie(tareas)
    return
  }

  void Promise.all(tareas.map((tarea) => tarea().then(() => undefined, () => undefined)))
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
