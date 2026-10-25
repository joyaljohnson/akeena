import { useEffect, useMemo, type CSSProperties } from 'react';
import { handwritingVars, loadHandwritingFont } from '../lib/handwriting';
import type { LetterData, SignedInfo } from '../lib/letterTypes';
import { LetterScroll } from './LetterScroll';
import { PhoneStage } from './PhoneStage';
import { AcceptancePage } from './pages/AcceptancePage';
import { ChaptersPage } from './pages/ChaptersPage';
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

/** The letter itself, without the surrounding phone column. */
export function LetterContent({
  data,
  signed = null,
  initialIndex,
  onAccept,
  onDownload,
}: LetterProps) {
  const { content } = data;

  useEffect(() => {
    void loadHandwritingFont(data.fontId);
  }, [data.fontId]);

  const pages = useMemo(
    () => [
      { key: 'cover', label: 'Cover', node: <CoverPage data={data} /> },
      { key: 'duties', label: content.duties.title, node: <DutiesPage content={content} /> },
      { key: 'chapters', label: 'Chapters', node: <ChaptersPage chapters={content.chapters} /> },
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

  return <LetterScroll pages={pages} initialIndex={initialIndex} />;
}

export function Letter(props: LetterProps) {
  return (
    <PhoneStage style={handwritingVars(props.data.fontId) as CSSProperties}>
      <LetterContent {...props} />
    </PhoneStage>
  );
}
