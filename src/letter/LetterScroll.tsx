import { useEffect, useRef, type ReactNode } from 'react';
import styles from './LetterScroll.module.css';

type LetterScrollProps = {
  pages: ReadonlyArray<{ key: string; label: string; node: ReactNode }>;
  /** Scrolls this page into view on mount (used by previews and revisits). */
  initialIndex?: number;
};

/** The letter as one continuous vertical scroll, with a thin reading-progress line. */
export function LetterScroll({ pages, initialIndex = 0 }: LetterScrollProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = el.scrollHeight - el.clientHeight;
      const ratio = max > 0 ? Math.min(1, el.scrollTop / max) : 0;
      if (bar.current) bar.current.style.transform = `scaleX(${ratio})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (initialIndex > 0) {
      scroller.current
        ?.querySelector<HTMLElement>(`[data-page="${initialIndex}"]`)
        ?.scrollIntoView({ block: 'start' });
    }
  }, [initialIndex]);

  return (
    <div className={styles.wrap}>
      <div className={styles.progress} aria-hidden="true">
        <div className={styles.bar} ref={bar} />
      </div>
      <div className={styles.scroller} ref={scroller} tabIndex={0} aria-label="Your letter">
        {pages.map((p, i) => (
          <section key={p.key} data-page={i} aria-label={p.label}>
            {p.node}
          </section>
        ))}
      </div>
    </div>
  );
}
