type Props = {
  className?: string
  acento?: string
}

/** Marca temporal: percha y vestido, hasta que se ponga el logo definitivo. */
export function LogoMarca({ className = '', acento = '#E7C8A0' }: Props) {
  return (
    <svg
      viewBox="0 0 80 80"
      className={className}
      role="img"
      aria-label="Fashion House"
    >
      <title>Fashion House</title>
      <rect width="80" height="80" rx="22" fill={acento} />
      <path
        fill="#6B2C2C"
        d="M32.2 37.2v5.2c0 1.4-.6 2.6-2.2 3.5L16.8 67h46.4L50 45.9c-1.6-.9-2.2-2.1-2.2-3.5v-5.2H32.2Z"
      />
      <path
        fill="none"
        stroke="#6B2C2C"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
        d="M40 15.8c.2-4.6 7.4-4.8 7.6.4M40 16.2v7.2M40 23.4 19.6 37.2h40.8L40 23.4Z"
      />
    </svg>
  )
}
