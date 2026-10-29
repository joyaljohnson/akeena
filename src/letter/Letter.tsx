import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { handwritingVars, loadHandwritingFont } from '../lib/handwriting';
import type { LetterData, SignedInfo } from '../lib/letterTypes';
import { DownloadButton } from '../export/DownloadButton';
import type { SignOutcome } from '../lib/signing';
import { LetterScroll } from './LetterScroll';
import { PhoneStage } from './PhoneStage';
import { AcceptancePage } from './pages/AcceptancePage';
import { ChaptersPage } from './pages/ChaptersPage';
import { SoundButton } from './SoundButton';
import { CoverPage } from './pages/CoverPage';
import { DutiesPage } from './pages/DutiesPage';
import { QuotePage } from './pages/QuotePage';

type LetterProps = {
  data: LetterData;
  signed?: SignedInfo | null;
  initialIndex?: number | 'last';
  onSign?: (name: string) => Promise<SignOutcome>;
  /** Write the cover note out like a pen (first opening only). */
  writeCover?: boolean;
};

/** The letter itself, without the surrounding phone column. */
export function LetterContent({
  data,
  signed = null,
  initialIndex,
  onSign,
  writeCover = false,
}: LetterProps) {
  const { content } = data;
  const [written, setWritten] = useState(false);
  const onWritten = useCallback(() => setWritten(true), []);

  useEffect(() => {
    void loadHandwritingFont(data.fontId);
  }, [data.fontId]);

  const pages = useMemo(
    () => [
      {
        key: 'cover',
        label: 'Cover',
        node: <CoverPage data={data} write={writeCover} showBackground onWritten={onWritten} />,
      },
      { key: 'duties', label: content.duties.title, node: <DutiesPage content={content} /> },
      {
        key: 'chapters',
        label: 'Chapters',
        node: (
          <ChaptersPage
            chapters={content.chapters}
            moodboard={content.moodboard}
            autoOpenFirst={writeCover}
          />
        ),
      },
      { key: 'quote', label: 'Closing quote', node: <QuotePage quote={content.closingQuote} /> },
      {
        key: 'accept',
        label: 'Acceptance',
        node: (
          <AcceptancePage
            content={content}
            signed={signed}
            onSign={onSign}
            downloadSlot={signed ? <DownloadButton data={data} signed={signed} /> : null}
          />
        ),
      },
    ],
    [data, content, signed, onSign, writeCover, onWritten],
  );

  return (
    <div
      data-palette="river"
      style={{ position: 'relative', height: '100%', background: 'var(--paper)' }}
    >
      <LetterScroll
        pages={pages}
        initialIndex={initialIndex}
        autoAdvanceAfterMs={writeCover && written ? 3000 : undefined}
      />
      <SoundButton />
    </div>
  );
}

export function Letter(props: LetterProps) {
  return (
    <PhoneStage style={handwritingVars(props.data.fontId) as CSSProperties}>
      <LetterContent {...props} />
    </PhoneStage>
  );
}
