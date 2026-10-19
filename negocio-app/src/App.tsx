import { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { CargandoSesion } from './components/CargandoSesion.tsx'
import { FranjaConexion } from './components/FranjaConexion.tsx'
import { RutaProtegida } from './components/RutaProtegida.tsx'
import { ProveedorConexion } from './context/ProveedorConexion.tsx'
import { ProveedorMovimiento } from './context/ProveedorMovimiento.tsx'
import { ProveedorSesion } from './context/ProveedorSesion.tsx'
import { ProveedorTransicion } from './context/ProveedorTransicion.tsx'
import { useConexion } from './context/useConexion.ts'
import { useSesion } from './context/useSesion.ts'
import { leerSenalesRed, redEsLenta } from './lib/dispositivo.ts'
import { precargarDatos } from './lib/precarga.ts'
import { olvidarMenuVentaSiSalio } from './lib/ventaConfirmada.ts'
import { Abonos } from './pages/Abonos.tsx'
import { Canasta } from './pages/Canasta.tsx'
import { Catalogo } from './pages/Catalogo.tsx'
import { Clientes } from './pages/Clientes.tsx'
import { Compartir } from './pages/Compartir.tsx'
import { Inicio } from './pages/Inicio.tsx'
import { Login } from './pages/Login.tsx'
import { Mensaje } from './pages/Mensaje.tsx'
import { Venta } from './pages/Venta.tsx'

const transicionPagina = { duration: 0.25, ease: [0.22, 1, 0.36, 1] } as const

function Rutas() {
  const ubicacion = useLocation()
  const reducirMovimiento = useReducedMotion()
  const { cargando } = useSesion()

  useEffect(() => {
    olvidarMenuVentaSiSalio(ubicacion.pathname)
  }, [ubicacion.pathname])

  if (cargando) return <CargandoSesion />

  return (
    <motion.div
      key={ubicacion.pathname}
      initial={reducirMovimiento ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducirMovimiento ? { duration: 0 } : transicionPagina}
      className="min-h-dvh w-full"
    >
      <Routes location={ubicacion}>
        <Route path="/login" element={<Login />} />
        <Route element={<RutaProtegida />}>
          <Route path="/" element={<Inicio />} />
          <Route path="/venta" element={<Venta />} />
          <Route path="/compartir/:clienteId" element={<Compartir />} />
          <Route path="/canasta" element={<Canasta />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/catalogo" element={<Catalogo />} />
          <Route path="/abonos" element={<Abonos />} />
          <Route path="/mensaje" element={<Mensaje />} />
        </Route>
      </Routes>
    </motion.div>
  )
}

function PrecargaDatos() {
  const { sesion, cargando } = useSesion()
  const { enLinea } = useConexion()

  useEffect(() => {
    if (cargando || !sesion || !enLinea) return

    const arrancar = () => precargarDatos(redEsLenta(leerSenalesRed()))
    const ventana = window as Window & {
      requestIdleCallback?: (callback: () => void, opciones?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }

    if (ventana.requestIdleCallback) {
      const id = ventana.requestIdleCallback(arrancar, { timeout: 1200 })
      return () => ventana.cancelIdleCallback?.(id)
    }

    const id = window.setTimeout(arrancar, 200)
    return () => window.clearTimeout(id)
  }, [cargando, enLinea, sesion])

  return null
}

export default function App() {
  return (
    <ProveedorMovimiento>
      <ProveedorConexion>
        <ProveedorSesion>
          <BrowserRouter>
            <ProveedorTransicion>
              <FranjaConexion />
              <PrecargaDatos />
              <Rutas />
            </ProveedorTransicion>
          </BrowserRouter>
        </ProveedorSesion>
      </ProveedorConexion>
    </ProveedorMovimiento>
  )
}
