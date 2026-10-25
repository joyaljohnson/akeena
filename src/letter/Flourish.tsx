type FlourishProps = { className?: string };

export function Flourish({ className }: FlourishProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 160 16"
      width="160"
      height="16"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2 8 H62 M98 8 H158"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path d="M80 2 C84 6 84 10 80 14 C76 10 76 6 80 2 Z" fill="currentColor" opacity="0.85" />
      <circle cx="68" cy="8" r="1.6" fill="currentColor" />
      <circle cx="92" cy="8" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function FloralBullet({ className }: FlourishProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
    >
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse
          key={a}
          cx="10"
          cy="5.2"
          rx="2.6"
          ry="4"
          fill="#E6CBC3"
          stroke="#C9A3A0"
          strokeWidth="0.6"
          transform={`rotate(${a} 10 10)`}
        />
      ))}
      <circle cx="10" cy="10" r="2" fill="#B8925A" />
    </svg>
  );
}
