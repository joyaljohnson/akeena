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

/** A simple heart for the list of duties. */
export function HeartBullet({ className }: FlourishProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M10 17.2 3.6 10.8C1.5 8.7 1.8 5.4 4.2 4.1c1.8-1 4-.4 5.8 1.7 1.8-2.1 4-2.7 5.8-1.7 2.4 1.3 2.7 4.6.6 6.7Z"
        fill="currentColor"
      />
    </svg>
  );
}
