import { Navigate, Outlet } from 'react-router-dom'
import { useSesion } from '../context/useSesion.ts'
import { CargandoSesion } from './CargandoSesion.tsx'

/** Deja pasar solo si hay sesión. Si no, manda a /login. */
export function RutaProtegida() {
  const { sesion, cargando } = useSesion()

  if (cargando) return <CargandoSesion />
  if (!sesion) return <Navigate to="/login" replace />
  return <Outlet />
}
