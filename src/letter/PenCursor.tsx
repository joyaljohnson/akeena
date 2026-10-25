import { useEffect, useRef, useState, type RefObject } from 'react';
import styles from './PenCursor.module.css';
import { penKeyframes, type PenPoint, type PenSchedule } from './penTiming';

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
 * A fountain pen that travels with the writing: its nib is at the point where the ink is appearing.
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
            t: b.startMs + (b.schedule.offsets[Number(el.dataset.pen)] ?? 0),
            x: r.left - box.left + r.width * 0.12,
            y: r.top - box.top + r.height * 0.8,
          });
        });
      }
      const { keyframes, durationMs } = penKeyframes(points);
      if (keyframes.length === 0) return stop();

      const firstAt = Math.max(0, Math.min(...points.map((p) => p.t)) - 500);
      const elapsed = performance.now() - startedAt;
      animation = pen.animate(
        keyframes.map((k) => ({
          offset: k.offset,
          opacity: k.opacity,
          transform: `translate(${k.x.toFixed(1)}px, ${k.y.toFixed(1)}px)`,
        })),
        { duration: durationMs, delay: firstAt - elapsed, fill: 'both', easing: 'linear' },
      );
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
      <svg className={styles.svg} viewBox="0 0 56 22" width="46" height="18" focusable="false">
        <defs>
          <linearGradient id="penBarrel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9A3C4B" />
            <stop offset="1" stopColor="#64202E" />
          </linearGradient>
        </defs>
        {/* nib */}
        <path
          d="M1 11 L13 6.2 Q15 6 15 8 L15 14 Q15 16 13 15.8 Z"
          fill="#E4DCCB"
          stroke="#8E8576"
          strokeWidth="0.7"
          strokeLinejoin="round"
        />
        <path d="M1.6 11 H10" stroke="#6E625A" strokeWidth="0.8" strokeLinecap="round" />
        {/* grip and gold ring */}
        <rect x="14" y="6" width="8.5" height="10" rx="2" fill="#3A2F2A" />
        <rect x="21.4" y="5.2" width="2.2" height="11.6" rx="0.8" fill="#C9A24E" />
        {/* barrel */}
        <rect x="23" y="4.5" width="30" height="13" rx="6.5" fill="url(#penBarrel)" />
        <rect x="27" y="6.6" width="21" height="2" rx="1" fill="#fff" opacity="0.22" />
        {/* clip */}
        <rect x="31" y="2.6" width="18" height="2.4" rx="1.2" fill="#C9A24E" />
      </svg>
    </div>
  );
}
