import { chapterLabel, describeEventTime, formatEventDate } from '../../lib/format';
import type { LetterChapter } from '../../lib/letterTypes';
import { Flourish } from '../Flourish';
import styles from './pages.module.css';

export function ChapterPage({ chapter }: { chapter: LetterChapter }) {
  const many = chapter.events.length > 1;
  return (
    <div className={styles.page} data-theme={chapter.theme}>
      <div className={styles.inner}>
        <p className={styles.label}>{chapterLabel(chapter.number)}</p>
        <h2 className={styles.title}>{chapter.title}</h2>
        <Flourish className={styles.flourish} />

        <section className={styles.section} aria-labelledby={`${chapter.id}-details`}>
          <h3 id={`${chapter.id}-details`} className={styles.label}>
            Details
          </h3>
          {chapter.events.map((e) => (
            <div key={`${e.date}-${e.venueName}`} className={styles.event}>
              {many && e.label && <span className={styles.eventLabel}>{e.label}</span>}
              <span className={styles.date}>{formatEventDate(e.date)}</span>
              <span>{describeEventTime(e.time, e.timeNote)}</span>
              <span className={styles.venue}>{e.venueName}</span>
              <a
                className={styles.directions}
                href={e.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Get directions
              </a>
            </div>
          ))}
        </section>

        <hr className={styles.rule} />

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
          {chapter.dressCodeNote && (
            <p className={`hand ${styles.aside}`}>{chapter.dressCodeNote}</p>
          )}
        </section>
      </div>
    </div>
  );
}
