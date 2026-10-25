import { REFERENCE_PATH, RING_GLYPHS } from './stampPaths';

type UnionStampProps = {
  /** Degrees, clockwise. The reference art is tilted about 6° clockwise. */
  rotation?: number;
  /** CSS width of the stamp. */
  size?: number | string;
  className?: string;
  title?: string;
};

const GOLD = '#B8925A';
const GOLD_LIGHT = '#D9BE8C';
const BURGUNDY = '#7E2E3A';
const CREAM = '#F7F3E9';
const PAGE = '#FFFCF5';

export function UnionStamp({
  rotation = 6,
  size = 120,
  className,
  title = 'God has joined them together, Mark 10:9',
}: UnionStampProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      style={{ transform: `rotate(${rotation}deg)`, overflow: 'visible' }}
      role="img"
      aria-label={title}
    >
      <rect x="8" y="8" width="184" height="184" rx="13" fill={CREAM} />
      <rect
        x="8"
        y="8"
        width="184"
        height="184"
        rx="13"
        fill="none"
        stroke={GOLD}
        strokeWidth="3.4"
        strokeDasharray="10 5.4"
      />
      <rect
        x="19"
        y="19"
        width="162"
        height="162"
        rx="6"
        fill="none"
        stroke={GOLD}
        strokeWidth="1.8"
      />
      <circle cx="100" cy="100" r="71" fill="none" stroke={GOLD} strokeWidth="1.9" />

      <g fill={GOLD}>
        {RING_GLYPHS.map((g, i) => (
          <path key={i} d={g.d} transform={g.transform} />
        ))}
      </g>

      <path
        d="M93.5 57.5 H106.5 V71.5 H117.5 V83.5 H106.5 V100 H93.5 V83.5 H82.5 V71.5 H93.5 Z"
        fill={BURGUNDY}
        stroke={BURGUNDY}
        strokeWidth="3.2"
        strokeLinejoin="round"
      />

      <g fill={PAGE} stroke={GOLD} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
        <path d="M50 103 C70 99 90 104 100 115 L100 145 C90 135 70 131 50 135 Z" />
        <path d="M150 103 C130 99 110 104 100 115 L100 145 C110 135 130 131 150 135 Z" />
      </g>
      <g fill="none" stroke={GOLD_LIGHT} strokeWidth="1.3" strokeLinecap="round">
        <path d="M60 109 C73 106 86 108 94 114" />
        <path d="M140 109 C127 106 114 108 106 114" />
      </g>

      <path d={REFERENCE_PATH} fill={BURGUNDY} />
    </svg>
  );
}
