import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { aplicarAnimaciones } from './lib/dispositivo.ts'
import './index.css'
import './lib/supabase.ts'

aplicarAnimaciones()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
