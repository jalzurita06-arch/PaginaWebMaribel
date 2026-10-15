export function Aviso({
  children,
  tono = 'error',
}: {
  children: string
  tono?: 'error' | 'ok'
}) {
  const esError = tono === 'error'

  return (
    <p
      role={esError ? 'alert' : 'status'}
      className={`rounded-3xl px-5 py-4 text-sm leading-relaxed text-black ${esError ? 'bg-peligro' : 'bg-afirmar'}`}
    >
      {children}
    </p>
  )
}
