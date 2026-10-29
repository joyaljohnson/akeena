import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import {
  chapterLabel,
  describeEventTime,
  formatEventDate,
  formatEventDateShort,
} from '../../lib/format';
import type { LetterChapter, LetterContent } from '../../lib/letterTypes';
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

type Swatch = NonNullable<LetterChapter['swatches']>[number];

/** Built-in colours for the themes that have a named colour (ten shades each). */
const THEME_SWATCHES: Partial<Record<LetterChapter['theme'], readonly Swatch[]>> = {
  pearl: [
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Snow', hex: '#FFFAFA' },
    { name: 'Ivory', hex: '#FFFFF0' },
    { name: 'Pearl', hex: '#FAF8F2' },
    { name: 'Cream', hex: '#FDF5E6' },
    { name: 'Chalk', hex: '#F5F2EA' },
    { name: 'Eggshell', hex: '#F0EAD6' },
    { name: 'Linen', hex: '#EEE8DA' },
    { name: 'Bone', hex: '#E9E4D4' },
    { name: 'Oyster', hex: '#E3DDCB' },
  ],
  gold: [
    { name: 'Champagne', hex: '#F7E7CE' },
    { name: 'Pale gold', hex: '#EBCF9E' },
    { name: 'Sunlit gold', hex: '#E8C86D' },
    { name: 'Honey gold', hex: '#DDB668' },
    { name: 'Classic gold', hex: '#D4AF37' },
    { name: 'Rich gold', hex: '#C9A24E' },
    { name: 'Antique gold', hex: '#B8925A' },
    { name: 'Burnished gold', hex: '#A67C2E' },
    { name: 'Bronze gold', hex: '#8F6A22' },
    { name: 'Old gold', hex: '#7A5A1C' },
  ],
};

function Swatches({ colours, label }: { colours: readonly Swatch[]; label: string }) {
  return (
    <ul className={styles.swatches} aria-label={`Colour palette: ${label}`}>
      {colours.map((c) => (
        <li key={c.hex + (c.name ?? '')} className={styles.swatch}>
          <span className={styles.chip} style={{ background: c.hex }} aria-hidden="true" />
          <span>{c.name ?? c.hex}</span>
        </li>
      ))}
    </ul>
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
        {(() => {
          const colours = chapter.swatches ?? THEME_SWATCHES[chapter.theme];
          return colours && colours.length > 0 ? (
            <Swatches colours={colours} label={chapter.dressCode} />
          ) : null;
        })()}
        {chapter.dressCodeNote && <p className={`hand ${styles.aside}`}>{chapter.dressCodeNote}</p>}
      </section>
    </div>
  );
}

type ChapterCardProps = {
  chapter: LetterChapter;
  /** Keeps the card open with no toggle (used by the image export). */
  alwaysOpen?: boolean;
  defaultOpen?: boolean;
  /** Opens the card on its own when this turns true (until the reader has opened one herself). */
  autoOpen?: boolean;
  onToggle?: () => void;
};

export function ChapterCard({
  chapter,
  alwaysOpen = false,
  defaultOpen = false,
  autoOpen = false,
  onToggle,
}: ChapterCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [seenAuto, setSeenAuto] = useState(false);
  if (autoOpen !== seenAuto) {
    setSeenAuto(autoOpen);
    if (autoOpen) setOpen(true);
  }
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
          onClick={() => {
            onToggle?.();
            setOpen((o) => !o);
          }}
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

function Moodboard({ moodboard }: { moodboard: NonNullable<LetterContent['moodboard']> }) {
  return (
    <section className={styles.moodboard} aria-labelledby="moodboard-title">
      <svg className={styles.moodIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M9 3h6l-1 6 3 3H7l3-3-1-6Zm3 9v8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <h2 id="moodboard-title" className={styles.label}>
        Moodboard
      </h2>
      <a className={styles.moodLink} href={moodboard.url} target="_blank" rel="noopener noreferrer">
        {moodboard.label}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </section>
  );
}

export function ChaptersPage({
  chapters,
  moodboard,
  alwaysOpen = false,
  autoOpenFirst = false,
}: {
  chapters: readonly LetterChapter[];
  moodboard?: LetterContent['moodboard'];
  alwaysOpen?: boolean;
  /** On the first reading, opens chapter one by itself once all the cards have been on screen a moment. */
  autoOpenFirst?: boolean;
}) {
  const [autoOpened, setAutoOpened] = useState(false);
  const touched = useRef(false);
  const cards = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cards.current;
    if (!autoOpenFirst || alwaysOpen || !el || typeof IntersectionObserver === 'undefined') return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        clearTimeout(timer);
        if (entry?.isIntersecting && !touched.current) {
          timer = setTimeout(() => {
            if (!touched.current) setAutoOpened(true);
            observer.disconnect();
          }, 2000);
        }
      },
      { threshold: 1 },
    );
    observer.observe(el);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [autoOpenFirst, alwaysOpen]);

  return (
    <div className={styles.page}>
      <div ref={cards} className={`${styles.inner} ${styles.cards}`}>
        {chapters.map((c, i) => (
          <ChapterCard
            key={c.id}
            chapter={c}
            alwaysOpen={alwaysOpen}
            autoOpen={i === 0 && autoOpened}
            onToggle={() => {
              touched.current = true;
            }}
          />
        ))}
        {/* A link means nothing in a saved picture, so the download leaves it out. */}
        {moodboard && !alwaysOpen && <Moodboard moodboard={moodboard} />}
      </div>
    </div>
  );
}
