import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import {
  chapterLabel,
  describeEventTime,
  formatEventDate,
  formatEventDateShort,
} from '../../lib/format';
import type { LetterChapter } from '../../lib/letterTypes';
import { ChapterIcon, DEFAULT_ICON_FOR_THEME } from '../ChapterIcon';
import styles from './pages.module.css';

function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0 1 13 0c0 5.3-6.5 11-6.5 11Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function ColourImage({ image }: { image: NonNullable<LetterChapter['colourImage']> }) {
  const base = `${import.meta.env.BASE_URL}img/${image.name}`;
  return (
    <figure className={styles.figure}>
      <picture>
        <source srcSet={`${base}.webp`} type="image/webp" />
        <img
          src={`${base}.jpg`}
          alt={image.alt}
          width={image.width}
          height={image.height}
          loading="lazy"
          decoding="async"
        />
      </picture>
    </figure>
  );
}

function ChapterDetails({ chapter }: { chapter: LetterChapter }) {
  const many = chapter.events.length > 1;
  return (
    <div className={styles.cardInner}>
      <hr className={styles.rule} />
      <section className={styles.section} aria-labelledby={`${chapter.id}-details`}>
        <h3 id={`${chapter.id}-details`} className={styles.label}>
          Details
        </h3>
        {chapter.events.map((e) => (
          <div key={`${e.date}-${e.venueName}`} className={styles.event}>
            {many && e.label && <span className={styles.eventLabel}>{e.label}</span>}
            <span className={styles.date}>{formatEventDate(e.date)}</span>
            <span>{describeEventTime(e.time, e.timeNote)}</span>
            <a
              className={styles.venueLink}
              href={e.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <PinIcon className={styles.pin} />
              <span className={styles.venueText}>{e.venueName}</span>
              <span className="sr-only"> (opens map in a new tab)</span>
            </a>
          </div>
        ))}
      </section>

      <section className={styles.section} aria-labelledby={`${chapter.id}-vibe`}>
        <h3 id={`${chapter.id}-vibe`} className={styles.label}>
          Vibe
        </h3>
        <p className={styles.body}>{chapter.vibe}</p>
      </section>

      <section className={styles.section} aria-labelledby={`${chapter.id}-colour`}>
        <h3 id={`${chapter.id}-colour`} className={styles.label}>
          The colour
        </h3>
        <p className={styles.body}>{chapter.dressCode}</p>
        {chapter.dressCodeNote && <p className={`hand ${styles.aside}`}>{chapter.dressCodeNote}</p>}
        {chapter.colourImage && <ColourImage image={chapter.colourImage} />}
      </section>
    </div>
  );
}

type ChapterCardProps = {
  chapter: LetterChapter;
  /** Keeps the card open with no toggle (used by the image export). */
  alwaysOpen?: boolean;
  defaultOpen?: boolean;
};

export function ChapterCard({
  chapter,
  alwaysOpen = false,
  defaultOpen = false,
}: ChapterCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const reduce = useReducedMotion();
  const expanded = alwaysOpen || open;
  const dates = [...new Set(chapter.events.map((e) => formatEventDateShort(e.date)))].join(' · ');
  const bodyId = `${chapter.id}-body`;

  const head = (
    <>
      <ChapterIcon name={chapter.icon ?? DEFAULT_ICON_FOR_THEME[chapter.theme]} open={expanded} />
      <span>
        <span className={styles.label}>{chapterLabel(chapter.number)}</span>
        <span className={styles.cardTitle} role="heading" aria-level={2}>
          {chapter.title}
        </span>
        <span className={styles.cardDate}>{dates}</span>
      </span>
    </>
  );

  return (
    <article className={styles.card} data-theme={chapter.theme}>
      {alwaysOpen ? (
        <div className={styles.cardHead}>{head}</div>
      ) : (
        <button
          type="button"
          className={styles.cardHead}
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={() => setOpen((o) => !o)}
        >
          {head}
        </button>
      )}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={bodyId}
            className={styles.cardBody}
            initial={alwaysOpen ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            <ChapterDetails chapter={chapter} />
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

export function ChaptersPage({
  chapters,
  alwaysOpen = false,
}: {
  chapters: readonly LetterChapter[];
  alwaysOpen?: boolean;
}) {
  return (
    <div className={styles.page}>
      <div className={`${styles.inner} ${styles.cards}`}>
        {chapters.map((c) => (
          <ChapterCard key={c.id} chapter={c} alwaysOpen={alwaysOpen} />
        ))}
      </div>
    </div>
  );
}
