// Placeholder art for the envelope. Each piece matches one layer the final artwork needs
// (see docs/ASSETS.md), so swapping in the real PNGs only touches this file.
import { useId } from 'react';

/** Envelope viewBox: 300 x 204 (aspect 0.68). The flap tip sits at y = 112. */
export const ENV_W = 300;
export const ENV_H = 204;
export const FLAP_TIP = 112;

type ArtProps = { className?: string };

/** envelope-front.png */
export function EnvelopeFrontArt({ className }: ArtProps) {
  const id = useId();
  return (
    <svg
      className={className}
      viewBox={`0 0 ${ENV_W} ${ENV_H}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-p`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FDFAF3" />
          <stop offset="1" stopColor="#F0E8D8" />
        </linearGradient>
      </defs>
      <rect
        x="0.5"
        y="0.5"
        width="299"
        height="203"
        rx="6"
        fill={`url(#${id}-p)`}
        stroke="#E0D3BA"
      />
      <rect
        x="9"
        y="9"
        width="282"
        height="186"
        rx="3"
        fill="none"
        stroke="#D9BE8C"
        strokeWidth="0.8"
        opacity="0.7"
      />
      <rect
        x="11"
        y="11"
        width="278"
        height="182"
        rx="2"
        fill="none"
        stroke="#fff"
        strokeWidth="1.2"
        opacity="0.8"
      />
    </svg>
  );
}

/** envelope-back-body.png: the pocket, without the flap. */
export function PocketArt({ className }: ArtProps) {
  const id = useId();
  return (
    <svg
      className={className}
      viewBox={`0 0 ${ENV_W} ${ENV_H}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-p`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F6EFE0" />
          <stop offset="1" stopColor="#EADFC8" />
        </linearGradient>
      </defs>
      <path
        d={`M0.5 0 L150 ${FLAP_TIP} L299.5 0 V197.5 a6 6 0 0 1 -6 6 H6.5 a6 6 0 0 1 -6 -6 Z`}
        fill={`url(#${id}-p)`}
        stroke="#E0D3BA"
      />
      <path d={`M1 202 L150 ${FLAP_TIP} L299 202`} fill="none" stroke="#DCCDAF" strokeWidth="0.9" />
      <path
        d={`M0.5 0 L150 ${FLAP_TIP} L299.5 0`}
        fill="none"
        stroke="#fff"
        strokeWidth="1.4"
        opacity="0.7"
      />
    </svg>
  );
}

/** The envelope interior, seen when the flap is open. */
export function InteriorArt({ className }: ArtProps) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${ENV_W} ${ENV_H}`}
      aria-hidden="true"
      focusable="false"
    >
      <rect width={ENV_W} height={ENV_H} rx="6" fill="#E7DBC2" />
      <rect y="0" width={ENV_W} height="70" rx="6" fill="#DDCFB3" opacity="0.55" />
    </svg>
  );
}

/** envelope-flap.png, outer face: transparent outside the flap shape. */
export function FlapOuterArt({ className }: ArtProps) {
  const id = useId();
  return (
    <svg
      className={className}
      viewBox={`0 0 ${ENV_W} ${FLAP_TIP}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-p`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FDFAF3" />
          <stop offset="1" stopColor="#F2E9D8" />
        </linearGradient>
      </defs>
      <path
        d={`M0.5 0.5 H299.5 L150 ${FLAP_TIP - 1} Z`}
        fill={`url(#${id}-p)`}
        stroke="#DCCDAF"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path
        d={`M10 4 H290 L150 ${FLAP_TIP - 12} Z`}
        fill="none"
        stroke="#D9BE8C"
        strokeWidth="0.7"
        opacity="0.6"
      />
    </svg>
  );
}

/** Inner face of the flap, seen once it has swung open. */
export function FlapInnerArt({ className }: ArtProps) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${ENV_W} ${FLAP_TIP}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={`M0.5 0.5 H299.5 L150 ${FLAP_TIP - 1} Z`}
        fill="#E3D6BB"
        stroke="#CDBD9C"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** flap-florals.png: a symmetrical relief cluster at the flap tip, behind the seal. */
export function FlapFloralsArt({ className }: ArtProps) {
  const flower = (cx: number, cy: number, r: number, key: string) => (
    <g key={key} transform={`translate(${cx} ${cy})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse
          key={a}
          cx="0"
          cy={-r * 0.9}
          rx={r * 0.55}
          ry={r}
          fill="#E6CBC3"
          stroke="#C9A3A0"
          strokeWidth="0.6"
          transform={`rotate(${a})`}
        />
      ))}
      <circle r={r * 0.4} fill="#D9BE8C" />
    </g>
  );
  const side = (dir: 1 | -1) => (
    <g transform={`translate(80 62) scale(${dir} 1)`}>
      <path
        d="M0 0 C22 -4 44 -14 60 -34"
        fill="none"
        stroke="#A9B39A"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M0 0 C20 4 42 6 62 -4"
        fill="none"
        stroke="#A9B39A"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      {[
        [16, -5, 28],
        [32, -12, 38],
        [46, -22, 48],
        [22, 3, -12],
        [40, 5, -6],
        [56, 0, 4],
      ].map(([x, y, r], i) => (
        <ellipse
          key={i}
          cx={x}
          cy={y}
          rx="3.6"
          ry="7.5"
          fill="#A9B39A"
          opacity="0.8"
          transform={`rotate(${r} ${x} ${y})`}
        />
      ))}
      {flower(34, -26, 7, 'a')}
      {flower(62, -12, 5.5, 'b')}
    </g>
  );
  return (
    <svg className={className} viewBox="0 0 160 70" aria-hidden="true" focusable="false">
      {side(1)}
      {side(-1)}
      <circle cx="80" cy="60" r="3" fill="#A9BCD0" opacity="0.8" />
    </svg>
  );
}

/** wax-seal.png: blush wax with an embossed peony. */
export function WaxSealArt({ className }: ArtProps) {
  const id = useId();
  const petals = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${id}-w`} cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#F3DCD5" />
          <stop offset="0.55" stopColor="#D9B0AA" />
          <stop offset="1" stopColor="#B98580" />
        </radialGradient>
        <filter id={`${id}-s`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow
            dx="0"
            dy="2.5"
            stdDeviation="2.5"
            floodColor="#5a2f2a"
            floodOpacity="0.35"
          />
        </filter>
      </defs>
      <path
        filter={`url(#${id}-s)`}
        fill={`url(#${id}-w)`}
        d="M50 4c9 0 12 6 20 7s17 4 19 13-3 13-1 21 8 14 3 22-12 8-17 15-9 12-18 12-12-7-20-8-17-3-21-12 4-13 2-21S5 50 9 41s12-8 16-15 10-22 25-22Z"
      />
      <g transform="translate(50 50)" opacity="0.95">
        {petals.map((a) => (
          <ellipse
            key={a}
            cx="0"
            cy="-15"
            rx="9"
            ry="14"
            fill="#E9C8C2"
            stroke="#B98580"
            strokeWidth="0.9"
            transform={`rotate(${a})`}
          />
        ))}
        {[22, 112, 202, 292].map((a) => (
          <ellipse
            key={a}
            cx="0"
            cy="-7"
            rx="6"
            ry="9"
            fill="#F3DCD5"
            stroke="#B98580"
            strokeWidth="0.8"
            transform={`rotate(${a})`}
          />
        ))}
        <circle r="4.5" fill="#C99894" stroke="#B98580" strokeWidth="0.8" />
      </g>
    </svg>
  );
}
