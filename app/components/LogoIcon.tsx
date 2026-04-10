interface Props {
  size?: number
  className?: string
}

export default function LogoIcon({ size = 24, className }: Props) {
  const id = `logo-grad-${size}`
  const flowId = `logo-flow-${size}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={id} x1="2" y1="2" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1f6feb" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
        <linearGradient id={flowId} x1="34" y1="12" x2="10" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1f6feb" stopOpacity="0.9" />
          <stop offset="1" stopColor="#0f766e" stopOpacity="0.35" />
        </linearGradient>
      </defs>

      {/* Board top — filled diamond with gradient */}
      <path
        d="M20 3L37 13L20 23L3 13L20 3Z"
        fill={`url(#${id})`}
      />

      {/* Cap brim — gradient stroke */}
      <path
        d="M8 17V23C8 23 12.5 29 20 29C27.5 29 32 23 32 23V17"
        stroke={`url(#${id})`}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Tassel — flows forward, symbolizing progress */}
      <path
        d="M37 13 C37 13 38 20 36 25 C34 30 29 33 23 34 C17 35 12 33 10 31"
        stroke={`url(#${flowId})`}
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="8.5" cy="30.5" r="2.5" fill="#0f766e" fillOpacity="0.75" />
    </svg>
  )
}
