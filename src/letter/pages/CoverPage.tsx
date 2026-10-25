import { useMemo, useState } from 'react';
import { fillTemplate } from '../../lib/format';
import type { LetterData } from '../../lib/letterTypes';
import { FloralCorner } from '../FloralCorner';
import { PenWriting } from '../PenWriting';
import { penSchedule, splitGraphemes } from '../penTiming';
import styles from './pages.module.css';

type CoverPageProps = {
  data: LetterData;
  /** Write the note and sign-off out like a pen. Off for the picture download and for revisits. */
  write?: boolean;
};

const START_MS = 900; // let the letter finish fading in first
const PAUSE_BEFORE_SIGNOFF_MS = 600;

export function CoverPage({ data, write = false }: CoverPageProps) {
  const { content } = data;
  const [skipped, setSkipped] = useState(false);
  const animate = write && !skipped;
  const headline = fillTemplate(content.cover.headlineTemplate, { name: data.name });
  const signOff = `${content.bride.signOff}\n${content.bride.firstName}`;

  const plan = useMemo(() => {
    const note = splitGraphemes(data.personalNote);
    const sign = splitGraphemes(signOff);
    const noteSchedule = penSchedule(note);
    const signSchedule = penSchedule(sign, { perCharMs: 80, maxTotalMs: 3500 });
    return {
      note,
      sign,
      noteSchedule,
      signSchedule,
      signStart: START_MS + noteSchedule.totalMs + PAUSE_BEFORE_SIGNOFF_MS,
    };
  }, [data.personalNote, signOff]);

  return (
    <div className={styles.page}>
      {/* Tapping the cover while it is being written shows the finished text straight away. */}
      <div
        className={`${styles.inner} ${styles.cover}`}
        onPointerDown={animate ? () => setSkipped(true) : undefined}
      >
        <FloralCorner className={`${styles.corner} ${styles.cornerTl}`} />
        <FloralCorner className={`${styles.corner} ${styles.cornerBr}`} />
        <h1 className={`hand ${styles.headline} ${animate ? 'fade-in' : ''}`}>{headline}</h1>
        <p className={`hand ${styles.note}`}>
          {animate ? (
            <PenWriting chars={plan.note} schedule={plan.noteSchedule} startMs={START_MS} />
          ) : (
            data.personalNote
          )}
        </p>
        <p className={`hand ${styles.signoff}`}>
          {animate ? (
            <PenWriting chars={plan.sign} schedule={plan.signSchedule} startMs={plan.signStart} />
          ) : (
            <>
              {content.bride.signOff}
              <br />
              {content.bride.firstName}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
