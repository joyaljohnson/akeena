import { Fragment, type ReactNode } from 'react';
import { penStrokeMs, type PenSchedule } from './penTiming';
import styles from './PenWriting.module.css';

type PenWritingProps = {
  /** The text, already split into characters (see splitGraphemes). */
  chars: readonly string[];
  schedule: PenSchedule;
  /** Delay before the first letter, in ms. */
  startMs: number;
};

/**
 * Writes text out letter by letter, like a pen. Each letter is uncovered by a soft left-to-right
 * wipe that overlaps the next one, so the writing flows instead of popping in. Screen readers get
 * the whole text at once (the animated copy is hidden from them).
 */
export function PenWriting({ chars, schedule, startMs }: PenWritingProps) {
  const duration = penStrokeMs(schedule);
  const nodes: ReactNode[] = [];
  let word: ReactNode[] = [];
  let key = 0;

  const flush = () => {
    if (word.length)
      nodes.push(
        <span key={`w${key++}`} className={styles.word}>
          {word}
        </span>,
      );
    word = [];
  };

  chars.forEach((c, i) => {
    if (c === ' ') {
      flush();
      nodes.push(<Fragment key={`s${key++}`}> </Fragment>);
    } else if (c === '\n') {
      flush();
      nodes.push(<br key={`b${key++}`} />);
    } else {
      word.push(
        <span
          key={i}
          className={styles.char}
          data-pen={i}
          style={{
            animationDelay: `${Math.round(startMs + (schedule.offsets[i] ?? 0))}ms`,
            animationDuration: `${Math.round(duration)}ms`,
          }}
        >
          {c}
        </span>,
      );
    }
  });
  flush();

  return (
    <>
      <span className="sr-only">{chars.join('')}</span>
      <span aria-hidden="true">{nodes}</span>
    </>
  );
}
