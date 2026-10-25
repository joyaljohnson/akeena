import { animate, motion, useMotionValue, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import styles from './Booklet.module.css';

type BookletProps = {
  pages: ReadonlyArray<{ key: string; label: string; node: ReactNode }>;
  initialIndex?: number;
};

const SWIPE_DISTANCE = 0.18;
const SWIPE_VELOCITY = 450;

export function Booklet({ pages, initialIndex = 0 }: BookletProps) {
  const [index, setIndex] = useState(initialIndex);
  const [width, setWidth] = useState(0);
  const viewport = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const reduce = useReducedMotion();
  const last = pages.length - 1;

  const go = useCallback((i: number) => setIndex(Math.max(0, Math.min(last, i))), [last]);

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const target = -index * width;
    if (reduce) x.set(target);
    else {
      const c = animate(x, target, { type: 'spring', stiffness: 320, damping: 36, mass: 0.9 });
      return () => c.stop();
    }
  }, [index, width, reduce, x]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      if (e.key === 'ArrowRight') go(index + 1);
      if (e.key === 'ArrowLeft') go(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index]);

  return (
    <div className={styles.booklet}>
      <div
        className={styles.viewport}
        ref={viewport}
        aria-roledescription="carousel"
        aria-label="Your letter"
      >
        <motion.div
          className={styles.track}
          style={{ x }}
          drag="x"
          dragDirectionLock
          dragMomentum={false}
          dragElastic={0.12}
          dragConstraints={{ left: -last * width, right: 0 }}
          onDragEnd={(_, info) => {
            const w = width || 1;
            if (info.offset.x < -w * SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY)
              go(index + 1);
            else if (info.offset.x > w * SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY)
              go(index - 1);
            else if (!reduce)
              animate(x, -index * width, { type: 'spring', stiffness: 320, damping: 36 });
          }}
        >
          {pages.map((p, i) => (
            <section
              key={p.key}
              className={styles.slide}
              role="group"
              aria-roledescription="page"
              aria-label={`${p.label}, page ${i + 1} of ${pages.length}`}
              inert={i !== index}
            >
              {p.node}
            </section>
          ))}
        </motion.div>
      </div>

      <nav className={styles.nav} aria-label="Letter pages">
        <button
          type="button"
          className={styles.arrow}
          onClick={() => go(index - 1)}
          disabled={index === 0}
          aria-label="Previous page"
        >
          <span aria-hidden="true">‹</span>
        </button>
        <div className={styles.center}>
          <div className={styles.dots}>
            {pages.map((p, i) => (
              <button
                key={p.key}
                type="button"
                className={styles.dotHit}
                onClick={() => go(i)}
                aria-label={`Go to ${p.label}`}
                aria-current={i === index ? 'page' : undefined}
              >
                <span className={i === index ? styles.dotOn : styles.dot} />
              </button>
            ))}
          </div>
          <span className={styles.count} aria-live="polite">
            {index + 1} / {pages.length}
          </span>
        </div>
        <button
          type="button"
          className={styles.arrow}
          onClick={() => go(index + 1)}
          disabled={index === last}
          aria-label="Next page"
        >
          <span aria-hidden="true">›</span>
        </button>
      </nav>
    </div>
  );
}
