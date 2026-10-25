import { formatSignedAt } from '../../lib/format';
import type { LetterContent, SignedInfo } from '../../lib/letterTypes';
import { UnionStamp } from '../UnionStamp';
import styles from './pages.module.css';

type AcceptancePageProps = {
  content: LetterContent;
  signed: SignedInfo | null;
  onAccept?: () => void;
  onDownload?: () => void;
};

/** Phase 1: presentational. The signing interaction is wired up in Phase 5. */
export function AcceptancePage({ content, signed, onAccept, onDownload }: AcceptancePageProps) {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h2 className={styles.title}>{content.acceptance.question}</h2>
        {signed ? (
          <>
            <p className={styles.oath}>{content.oath}</p>
            <div className={styles.sigBlock}>
              <div className={styles.sigRow}>
                <p className={`hand ${styles.sigName}`}>{signed.name}</p>
                <UnionStamp className={styles.stamp} size={118} />
              </div>
              <p className={styles.signedAt}>
                ✅ Signed by {signed.name} · {formatSignedAt(signed.at)}
              </p>
            </div>
            <button type="button" className={styles.download} onClick={onDownload}>
              Download your letter
            </button>
          </>
        ) : (
          <button type="button" className={styles.yes} onClick={onAccept}>
            {content.acceptance.yesLabel}
          </button>
        )}
      </div>
    </div>
  );
}
