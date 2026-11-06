import { useEffect, useState, type CSSProperties } from 'react';
import { handwritingVars, loadHandwritingFont } from '../lib/handwriting';
import type { GuideChapter } from '../lib/guideTypes';
import type { LetterChapter } from '../lib/letterTypes';
import type { GuidePayload } from '../lib/rpcSchemas';
import { Flourish } from '../letter/Flourish';
import {
  ChaptersPage,
  EventsSection,
  Moodboard,
  Swatches,
  VibeSection,
} from '../letter/pages/ChaptersPage';
import pages from '../letter/pages/pages.module.css';
import { Lightbox, type Look } from './Lightbox';
import styles from './guide.module.css';

function DressSection({
  chapter,
  guide,
  onOpen,
}: {
  chapter: LetterChapter;
  guide: GuideChapter;
  onOpen: (looks: readonly Look[], index: number) => void;
}) {
  const looks: Look[] = guide.looks.map((l, i) => ({
    url: l.url,
    alt: l.alt ?? `${chapter.title}: outfit idea ${i + 1}`,
  }));
  return (
    <section className={pages.section} aria-labelledby={`${chapter.id}-dress`}>
      <h3 id={`${chapter.id}-dress`} className={pages.label}>
        Dress code
      </h3>
      <p className={styles.dress}>{guide.dressCode}</p>
      {guide.details && <p className={styles.dressNote}>{guide.details}</p>}
      {guide.swatches && guide.swatches.length > 0 && (
        <Swatches colours={guide.swatches} label={guide.dressCode} />
      )}
      {looks.length > 0 && (
        <ul className={styles.looks} aria-label={`${chapter.title}: outfit ideas`}>
          {looks.map((look, i) => (
            <li key={look.url}>
              <button
                type="button"
                className={styles.look}
                onClick={() => onOpen(looks, i)}
                aria-label={`${look.alt}, view larger`}
              >
                <img src={look.url} alt="" loading={i < 2 ? 'eager' : 'lazy'} decoding="async" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The groomsmen page: the four chapters with their details and dress code. */
export function GuidePage({ payload }: { payload: GuidePayload }) {
  const { content, chapters } = payload;
  const [open, setOpen] = useState<{ looks: readonly Look[]; index: number } | null>(null);

  useEffect(() => {
    void loadHandwritingFont(payload.font);
  }, [payload.font]);

  return (
    <main
      className={styles.scroll}
      style={handwritingVars(payload.font) as CSSProperties}
      aria-label={content.heading}
      tabIndex={-1}
    >
      <header className={styles.head}>
        <h1 className={`hand ${styles.heading}`}>{content.heading}</h1>
        <Flourish className={styles.flourish} />
        {content.intro && <p className={styles.intro}>{content.intro}</p>}
      </header>

      <ChaptersPage
        chapters={chapters}
        alwaysOpen
        renderBody={(chapter) => {
          const guide = content.chapters[chapter.id];
          return (
            <div className={pages.cardInner}>
              <hr className={pages.rule} />
              <EventsSection chapter={chapter} />
              <VibeSection chapter={chapter} />
              {guide && (
                <DressSection
                  chapter={chapter}
                  guide={guide}
                  onOpen={(looks, index) => setOpen({ looks, index })}
                />
              )}
            </div>
          );
        }}
      />

      {content.moodboard && (
        <div className={styles.moodWrap}>
          <Moodboard moodboard={content.moodboard} />
        </div>
      )}
      {content.closing && <p className={`hand ${styles.closing}`}>{content.closing}</p>}

      {open && (
        <Lightbox
          looks={open.looks}
          index={open.index}
          onClose={() => setOpen(null)}
          onStep={(index) => setOpen((o) => (o ? { ...o, index } : o))}
        />
      )}
    </main>
  );
}
