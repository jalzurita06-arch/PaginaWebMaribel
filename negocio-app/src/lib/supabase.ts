import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const clave = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !clave) {
  console.error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Copia .env.example a .env y completa los valores de tu proyecto de Supabase.',
  )
}

/**
 * Cliente de Supabase. Es null si faltan las variables de entorno.
 * Sin opciones de auth: la sesión usa la persistencia por defecto de supabase-js (localStorage).
 */
export const supabase: SupabaseClient | null =
  url && clave ? createClient(url, clave) : null
