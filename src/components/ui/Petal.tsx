interface PetalProps {
  size?: number
  className?: string
  opacity?: number
}

export function Petal({ size = 24, className = '', opacity = 1 }: PetalProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ opacity }}
      aria-hidden
    >
      <path
        d="M12 2 C 14 6, 14 10, 12 12 C 10 10, 10 6, 12 2 Z"
        fill="currentColor"
      />
      <path
        d="M22 12 C 18 14, 14 14, 12 12 C 14 10, 18 10, 22 12 Z"
        fill="currentColor"
        opacity="0.8"
      />
      <path
        d="M12 22 C 10 18, 10 14, 12 12 C 14 14, 14 18, 12 22 Z"
        fill="currentColor"
        opacity="0.6"
      />
      <path
        d="M2 12 C 6 10, 10 10, 12 12 C 10 14, 6 14, 2 12 Z"
        fill="currentColor"
        opacity="0.7"
      />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  )
}

export function PetalCluster({ size = 120, className = '', opacity = 0.12 }: PetalProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      className={className}
      style={{ opacity }}
      aria-hidden
    >
      <g transform="translate(60 60)">
        {[0, 60, 120, 180, 240, 300].map(angle => (
          <ellipse
            key={angle}
            cx="0"
            cy="-26"
            rx="11"
            ry="26"
            fill="currentColor"
            transform={`rotate(${angle})`}
          />
        ))}
        <circle r="8" fill="currentColor" />
      </g>
    </svg>
  )
}
