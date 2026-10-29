import { handwritingVars } from '../lib/handwriting';
import type { LetterData, SignedInfo } from '../lib/letterTypes';
import { AcceptancePage } from '../letter/pages/AcceptancePage';
import { ChaptersPage } from '../letter/pages/ChaptersPage';
import { CoverPage } from '../letter/pages/CoverPage';
import { DutiesPage } from '../letter/pages/DutiesPage';
import { QuotePage } from '../letter/pages/QuotePage';
import styles from './ExportLetter.module.css';

/** Width the letter is laid out at. The image is then scaled up to 1080px across (see utils). */
export const EXPORT_CSS_WIDTH = 390;

type ExportLetterProps = { data: LetterData; signed: SignedInfo };

/**
 * The whole signed letter on one tall page: every page stacked, every chapter open, no buttons,
 * no motion. It is laid out like the phone version so the picture matches what she read.
 */
export function ExportLetter({ data, signed }: ExportLetterProps) {
  const { content } = data;
  return (
    <div
      className={styles.root}
      style={handwritingVars(data.fontId)}
      data-export-root
      data-palette="river"
    >
      <CoverPage data={data} />
      <DutiesPage content={content} />
      <ChaptersPage chapters={content.chapters} alwaysOpen />
      <QuotePage quote={content.closingQuote} />
      <AcceptancePage content={content} signed={signed} exportMode />
    </div>
  );
}
