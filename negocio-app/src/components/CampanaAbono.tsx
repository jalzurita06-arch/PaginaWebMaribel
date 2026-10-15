import { Bell } from 'lucide-react'

export function CampanaAbono({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-alerta text-white shadow-[0_0_0_2px_#fff] ${className}`}
      title="Sin abono en 5 días"
    >
      <Bell aria-hidden size={14} strokeWidth={2.4} className="fill-current" />
      <span className="sr-only">Sin abono en los últimos 5 días</span>
    </span>
  )
}
