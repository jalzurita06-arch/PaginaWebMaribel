import { useReducedMotion } from 'framer-motion'

export function IndicadorCarga({ children }: { children: string }) {
  const reducirMovimiento = useReducedMotion()

  return (
    <div
      role="status"
      className="flex w-fit items-center gap-3 rounded-full bg-black/5 px-5 py-3 text-sm"
    >
      <span
        aria-hidden="true"
        className={`size-2.5 shrink-0 rounded-full bg-black ${reducirMovimiento ? '' : 'animate-pulse'}`}
      />
      {children}
    </div>
  )
}
