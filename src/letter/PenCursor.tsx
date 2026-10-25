import { useEffect, useRef, useState, type RefObject } from 'react';
import styles from './PenCursor.module.css';
import { inkEdgeMs, penKeyframes, type PenPoint, type PenSchedule } from './penTiming';

type Block = {
  /** The paragraph being written (its letters are marked with data-pen). */
  ref: RefObject<HTMLElement | null>;
  startMs: number;
  schedule: PenSchedule;
};

type PenCursorProps = {
  /** The positioned box the pen lives in. */
  containerRef: RefObject<HTMLElement | null>;
  blocks: readonly Block[];
  /** When the writing began (performance.now()), so the pen stays in step with the letters. */
  startedAt: number;
};

/**
 * A feather quill that travels with the writing: its nib is at the point where the ink is appearing.
 * The path is measured from where the letters really are on screen, then played back on the same
 * clock as the letter-by-letter reveal.
 */
export function PenCursor({ containerRef, blocks, startedAt }: PenCursorProps) {
  const penRef = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let animation: Animation | null = null;

    const stop = () => {
      animation?.cancel();
      setDone(true);
    };

    const start = async () => {
      // Measure once the handwriting font is in, or the letters would still move afterwards.
      await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const container = containerRef.current;
      const pen = penRef.current;
      if (cancelled || !container || !pen) return;

      const box = container.getBoundingClientRect();
      const points: PenPoint[] = [];
      for (const b of blocks) {
        b.ref.current?.querySelectorAll<HTMLElement>('[data-pen]').forEach((el) => {
          const r = el.getBoundingClientRect();
          points.push({
            // The nib rides the leading edge of the ink, not the start of the letter.
            t: inkEdgeMs(b.startMs + (b.schedule.offsets[Number(el.dataset.pen)] ?? 0), b.schedule),
            x: r.left - box.left + r.width * 0.25,
            y: r.top - box.top + r.height * 0.8,
          });
        });
      }
      const { keyframes, durationMs } = penKeyframes(points);
      if (keyframes.length === 0) return stop();

      const firstAt = Math.max(0, Math.min(...points.map((p) => p.t)) - 500);
      animation = pen.animate(
        keyframes.map((k) => ({
          offset: k.offset,
          opacity: k.opacity,
          transform: `translate(${k.x.toFixed(1)}px, ${k.y.toFixed(1)}px)`,
        })),
        { duration: durationMs, fill: 'both', easing: 'linear' },
      );

      // Run on the very same clock as the letters: their CSS animations all began at one moment, so
      // take that moment from the browser instead of guessing it. (Guessing was a few letters off.)
      const zero = lettersStartedAt(blocks);
      if (zero !== null) animation.startTime = zero + firstAt;
      else animation.currentTime = Math.max(0, performance.now() - startedAt - firstAt);
      animation.onfinish = () => {
        if (!cancelled) setDone(true);
      };
    };

    void start();
    // If the screen changes shape mid-write the measured path is wrong, so the pen simply leaves.
    window.addEventListener('resize', stop);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', stop);
      animation?.cancel();
    };
  }, [containerRef, blocks, startedAt]);

  if (done) return null;
  return (
    <div ref={penRef} className={styles.pen} data-pen-cursor aria-hidden="true">
      <div className={styles.swing}>
        <div className={styles.bob}>
          <svg
            className={styles.svg}
            viewBox="0 0 60 24"
            width="38"
            height="15.2"
            focusable="false"
          >
            <defs>
              <linearGradient id="quillVane" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0" stopColor="#FBF7EF" />
                <stop offset="0.55" stopColor="#F2DDD6" />
                <stop offset="1" stopColor="#E2BDB5" />
              </linearGradient>
            </defs>
            {/* a soft shadow drawn as part of the picture (no CSS filter, which can paint a box) */}
            <path d={VANE} transform="translate(1.6 2.6)" fill="#3A2F2A" opacity="0.13" />
            <path
              d={VANE}
              fill="url(#quillVane)"
              stroke="#B98580"
              strokeWidth="0.6"
              strokeLinejoin="round"
            />
            <g stroke="#B98580" strokeWidth="0.45" opacity="0.6" strokeLinecap="round">
              <path d="M21 11.3 L25.5 5.4" />
              <path d="M21 11.8 L23.5 16.4" />
              <path d="M28 10.4 L34 4.4" />
              <path d="M28 10.9 L30.5 17" />
              <path d="M36 8.6 L44 3.2" />
              <path d="M36 9.1 L39 15" />
              <path d="M44 6.4 L52 2.4" />
              <path d="M44 6.9 L48 12.6" />
            </g>
            {/* shaft, in gold */}
            <path
              d="M10 12 C 24 10.6 42 6 59 1.2"
              fill="none"
              stroke="#C9A24E"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            {/* the nib */}
            <path d="M1 12 L10.5 10.1 L10.5 13.9 Z" fill="#3A2F2A" />
            <path d="M1.6 12 H8" stroke="#E4DCCB" strokeWidth="0.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

/** When the letters' reveal began, on the page's animation clock (null if the browser won't say). */
function lettersStartedAt(blocks: readonly Block[]): number | null {
  const probe = blocks[0]?.ref.current?.querySelector<HTMLElement>('[data-pen]');
  const css = probe?.getAnimations?.().find((a) => typeof a.startTime === 'number');
  return css && typeof css.startTime === 'number' ? css.startTime : null;
}

/** The feather's outline, from its quill at the nib end out to the tip. */
const VANE =
  'M11 12 C 18 5.5, 36 -0.5, 59 1 C 57 6.5, 51 10.5, 41 14.5 C 31 18.5, 19 16.5, 11 12 Z';
