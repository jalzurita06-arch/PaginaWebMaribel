export function EtiquetaEstado({ estado, className = '' }: { estado: string; className?: string }) {
  const activo = estado === 'activo'

  return (
    <span
      className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm ${activo ? 'bg-afirmar' : 'bg-peligro'} ${className}`}
    >
      {activo ? 'Activo' : 'Inactivo'}
    </span>
  )
}
