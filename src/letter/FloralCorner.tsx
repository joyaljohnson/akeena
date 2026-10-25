type FloralCornerProps = { className?: string };

/** Placeholder for floral-corner.png: same footprint, drop-in replaceable by the final art. */
export function FloralCorner({ className }: FloralCornerProps) {
  const petals = [0, 60, 120, 180, 240, 300];
  return (
    <svg
      className={className}
      viewBox="0 0 140 140"
      width="140"
      height="140"
      aria-hidden="true"
      focusable="false"
    >
      <g transform="translate(34 34)">
        {petals.map((a) => (
          <ellipse
            key={a}
            cx="0"
            cy="-15"
            rx="9"
            ry="16"
            fill="#E6CBC3"
            stroke="#C9A3A0"
            strokeWidth="0.8"
            transform={`rotate(${a})`}
            opacity="0.9"
          />
        ))}
        <circle r="6" fill="#D9BE8C" />
      </g>
      <path
        d="M52 50 C84 52 108 70 126 104"
        fill="none"
        stroke="#A9B39A"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M50 54 C52 86 70 110 104 126"
        fill="none"
        stroke="#A9B39A"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {[
        [78, 60, 20],
        [100, 78, 50],
        [112, 94, 70],
        [60, 80, -20],
        [78, 102, -50],
        [94, 114, -70],
      ].map(([x, y, r], i) => (
        <ellipse
          key={i}
          cx={x}
          cy={y}
          rx="4.5"
          ry="9"
          fill="#A9B39A"
          opacity="0.75"
          transform={`rotate(${r} ${x} ${y})`}
        />
      ))}
      <circle cx="118" cy="40" r="4" fill="#A9BCD0" opacity="0.8" />
      <circle cx="40" cy="118" r="4" fill="#A9BCD0" opacity="0.8" />
    </svg>
  );
}
