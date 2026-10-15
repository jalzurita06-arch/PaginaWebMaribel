import { useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { CargandoSesion } from './components/CargandoSesion.tsx'
import { FranjaConexion } from './components/FranjaConexion.tsx'
import { RutaProtegida } from './components/RutaProtegida.tsx'
import { ProveedorConexion } from './context/ProveedorConexion.tsx'
import { ProveedorSesion } from './context/ProveedorSesion.tsx'
import { useSesion } from './context/useSesion.ts'
import { olvidarMenuVentaSiSalio } from './lib/ventaConfirmada.ts'
import { Abonos } from './pages/Abonos.tsx'
import { Canasta } from './pages/Canasta.tsx'
import { Catalogo } from './pages/Catalogo.tsx'
import { Clientes } from './pages/Clientes.tsx'
import { Compartir } from './pages/Compartir.tsx'
import { Inicio } from './pages/Inicio.tsx'
import { Login } from './pages/Login.tsx'
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
    <AnimatePresence mode="wait">
      <motion.div
        key={ubicacion.pathname}
        initial={reducirMovimiento ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reducirMovimiento ? { opacity: 0 } : { opacity: 0, y: -12 }}
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
          </Route>
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <ProveedorConexion>
      <ProveedorSesion>
        <BrowserRouter>
          <FranjaConexion />
          <Rutas />
        </BrowserRouter>
      </ProveedorSesion>
    </ProveedorConexion>
  )
}
