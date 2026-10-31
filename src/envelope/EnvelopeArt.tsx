// The envelope pictures. The closed back of the envelope is one photograph; the flap is the big
// triangle in it. So the flap and the pocket are made from that same picture: the flap layer shows
// only the triangle, the pocket layer shows everything except the triangle. Closed, they line up
// pixel for pixel; open, the flap swings away and the inside shows through the V.
import type { CSSProperties } from 'react';

const ART = `${import.meta.env.BASE_URL}img/`;

/** Aspect of the envelope pictures: 2528 x 1696. */
export const ENVELOPE_RATIO = 1696 / 2528;
/** How far down the flap's point reaches, as a fraction of the envelope's height. */
export const FLAP_TIP = 1251 / 1696;

// The flap triangle (with its two clipped top corners), measured on the 2528 x 1696 picture and
// written as fractions of the whole envelope.
const FLAP: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [1, 0],
  [1, 40 / 1696],
  [2473 / 2528, 160 / 1696],
  [0.5, FLAP_TIP],
  [55 / 2528, 160 / 1696],
  [0, 40 / 1696],
];
const pct = (n: number) => `${(n * 100).toFixed(3)}%`;

/** The flap outline in the envelope's own coordinates (for the pocket's cut-out). */
const flapInEnvelope = FLAP.map(([x, y]) => `${pct(x)} ${pct(y)}`).join(', ');
/** The same outline in the flap layer's coordinates (that layer stops at the point). */
const flapInFlapBox = FLAP.map(([x, y]) => `${pct(x)} ${pct(y / FLAP_TIP)}`).join(', ');

type ArtProps = { className?: string };

function Picture({ name, className, style }: ArtProps & { name: string; style?: CSSProperties }) {
  return (
    <img
      className={className}
      style={style}
      src={`${ART}${name}.webp`}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
    />
  );
}

/** The front of the envelope, with its embossed ferns. */
export function EnvelopeFrontArt({ className }: ArtProps) {
  return <Picture name="envelope-front" className={className} />;
}

/** The back of the envelope without its flap: everything except the triangle. */
export function PocketArt({ className }: ArtProps) {
  return (
    <Picture
      name="envelope-back"
      className={className}
      style={{
        clipPath: `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${flapInEnvelope}, 0 0)`,
      }}
    />
  );
}

/** The inside of the envelope, seen through the opening once the flap is up. */
export function InteriorArt({ className }: ArtProps) {
  return <Picture name="envelope-inner" className={className} style={{ objectFit: 'cover' }} />;
}

/** The outside of the flap: the triangle cut from the closed-back picture. */
export function FlapOuterArt({ className }: ArtProps) {
  return (
    <div
      className={className}
      aria-hidden="true"
      style={{
        backgroundImage: `url(${ART}envelope-back.webp)`,
        backgroundSize: `100% ${(100 / FLAP_TIP).toFixed(3)}%`,
        backgroundPosition: 'top',
        backgroundRepeat: 'no-repeat',
        clipPath: `polygon(${flapInFlapBox})`,
      }}
    />
  );
}

/** The underside of the flap, seen once it has swung open. */
export function FlapInnerArt({ className }: ArtProps) {
  return (
    <div
      className={className}
      aria-hidden="true"
      style={{
        backgroundImage: `url(${ART}envelope-inner.webp)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center bottom',
        clipPath: `polygon(${flapInFlapBox})`,
      }}
    />
  );
}

/** The blush wax seal with its embossed paw print (drawn, see public/img/paw-seal.svg). */
export function WaxSealArt({ className }: ArtProps) {
  return (
    <img
      className={className}
      src={`${ART}paw-seal.svg`}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
    />
  );
}
