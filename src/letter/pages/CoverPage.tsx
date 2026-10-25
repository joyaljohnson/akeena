import { useEffect, useMemo, useRef, useState } from 'react';
import { fillTemplate } from '../../lib/format';
import type { LetterData } from '../../lib/letterTypes';
import { CoverBackground } from '../CoverBackground';
import { PenCursor } from '../PenCursor';
import { PenWriting } from '../PenWriting';
import { penSchedule, splitGraphemes } from '../penTiming';
import styles from './pages.module.css';

type CoverPageProps = {
  data: LetterData;
  /** Write the note and sign-off out like a pen. Off for the picture download and for revisits. */
  write?: boolean;
  /** Show the film behind the cover. Off for the picture download and the admin preview. */
  showBackground?: boolean;
  /** Called once the writing has finished (or was skipped by a tap). */
  onWritten?: () => void;
};

const START_MS = 900; // let the letter finish fading in first
const PAUSE_BEFORE_SIGNOFF_MS = 800;

export function CoverPage({
  data,
  write = false,
  showBackground = false,
  onWritten,
}: CoverPageProps) {
  const { content } = data;
  const [skipped, setSkipped] = useState(false);
  const [startedAt] = useState(() => performance.now());
  const innerRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLParagraphElement>(null);
  const signRef = useRef<HTMLParagraphElement>(null);
  const animate = write && !skipped;
  const headline = fillTemplate(content.cover.headlineTemplate, { name: data.name });
  const signOff = `${content.bride.signOff}\n${content.bride.firstName}`;

  const plan = useMemo(() => {
    const note = splitGraphemes(data.personalNote);
    const sign = splitGraphemes(signOff);
    const noteSchedule = penSchedule(note);
    const signSchedule = penSchedule(sign, { perCharMs: 120, maxTotalMs: 5500 });
    const signStart = START_MS + noteSchedule.totalMs + PAUSE_BEFORE_SIGNOFF_MS;
    return { note, sign, noteSchedule, signSchedule, signStart };
  }, [data.personalNote, signOff]);

  const penBlocks = useMemo(
    () => [
      { ref: noteRef, startMs: START_MS, schedule: plan.noteSchedule },
      { ref: signRef, startMs: plan.signStart, schedule: plan.signSchedule },
    ],
    [plan],
  );

  useEffect(() => {
    if (!write || !onWritten) return;
    if (skipped) {
      onWritten();
      return;
    }
    const id = setTimeout(onWritten, plan.signStart + plan.signSchedule.totalMs);
    return () => clearTimeout(id);
  }, [write, skipped, onWritten, plan]);

  return (
    <div className={styles.page}>
      {showBackground && content.cover.background && (
        <CoverBackground
          videoUrl={content.cover.background.videoUrl}
          posterUrl={content.cover.background.posterUrl}
        />
      )}
      {/* Tapping the cover while it is being written shows the finished text straight away. */}
      <div
        ref={innerRef}
        className={`${styles.inner} ${styles.cover}`}
        onPointerDown={animate ? () => setSkipped(true) : undefined}
      >
        {animate && <PenCursor containerRef={innerRef} blocks={penBlocks} startedAt={startedAt} />}
        <h1 className={`hand ${styles.headline} ${animate ? 'fade-in' : ''}`}>{headline}</h1>
        <p ref={noteRef} className={`hand ${styles.note}`}>
          {animate ? (
            <PenWriting chars={plan.note} schedule={plan.noteSchedule} startMs={START_MS} />
          ) : (
            data.personalNote
          )}
        </p>
        <p ref={signRef} className={`hand ${styles.signoff}`}>
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
