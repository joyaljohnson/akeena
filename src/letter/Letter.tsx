import { useEffect, useMemo, type CSSProperties } from 'react';
import { handwritingVars, loadHandwritingFont } from '../lib/handwriting';
import type { LetterData, SignedInfo } from '../lib/letterTypes';
import { LetterScroll } from './LetterScroll';
import styles from './Letter.module.css';
import { AcceptancePage } from './pages/AcceptancePage';
import { ChapterPage } from './pages/ChapterPage';
import { CoverPage } from './pages/CoverPage';
import { DutiesPage } from './pages/DutiesPage';
import { QuotePage } from './pages/QuotePage';

type LetterProps = {
  data: LetterData;
  signed?: SignedInfo | null;
  initialIndex?: number;
  onAccept?: () => void;
  onDownload?: () => void;
};

export function Letter({ data, signed = null, initialIndex, onAccept, onDownload }: LetterProps) {
  const { content } = data;

  useEffect(() => {
    void loadHandwritingFont(data.fontId);
  }, [data.fontId]);

  const pages = useMemo(
    () => [
      { key: 'cover', label: 'Cover', node: <CoverPage data={data} /> },
      { key: 'duties', label: content.duties.title, node: <DutiesPage content={content} /> },
      ...content.chapters.map((c) => ({
        key: c.id,
        label: `Chapter ${c.number}: ${c.title}`,
        node: <ChapterPage chapter={c} />,
      })),
      { key: 'quote', label: 'Closing quote', node: <QuotePage quote={content.closingQuote} /> },
      {
        key: 'accept',
        label: 'Acceptance',
        node: (
          <AcceptancePage
            content={content}
            signed={signed}
            onAccept={onAccept}
            onDownload={onDownload}
          />
        ),
      },
    ],
    [data, content, signed, onAccept, onDownload],
  );

  return (
    <div className={styles.stage}>
      <div className={styles.column} style={handwritingVars(data.fontId) as CSSProperties}>
        <LetterScroll pages={pages} initialIndex={initialIndex} />
      </div>
    </div>
  );
}
