import { BotonSeccion } from '../components/BotonSeccion.tsx'
import { Layout } from '../components/Layout.tsx'
import { acentoInicio, menuInicio } from '../config/secciones.ts'

export function Inicio() {
  return (
    <Layout titulo="Inicio" subtitulo="Menú principal" acento={acentoInicio}>
      <nav aria-label="Secciones" className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4 xl:grid-cols-3">
        {menuInicio.map((seccion) => (
          <BotonSeccion key={seccion.ruta} {...seccion} />
        ))}
      </nav>
    </Layout>
  )
}
