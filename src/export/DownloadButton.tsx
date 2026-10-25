import { useEffect, useRef, useState } from 'react';
import type { LetterData, SignedInfo } from '../lib/letterTypes';
import { deliver, canShareFile } from './deliver';
import styles from './DownloadButton.module.css';
import { exportFilename, isInAppBrowser } from './utils';

type DownloadButtonProps = { data: LetterData; signed: SignedInfo };

type Ready = { blob: Blob; filename: string };

export function DownloadButton({ data, signed }: DownloadButtonProps) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(false);
  const [ready, setReady] = useState<Ready | null>(null);
  const [showPicture, setShowPicture] = useState(false);
  const [pictureUrl, setPictureUrl] = useState<string | null>(null);
  const canceled = useRef(false);
  const inApp = typeof navigator !== 'undefined' && isInAppBrowser(navigator.userAgent);

  useEffect(() => {
    canceled.current = false;
    return () => {
      canceled.current = true;
    };
  }, []);

  const urlRef = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const openPicture = (blob: Blob) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = URL.createObjectURL(blob);
    setPictureUrl(urlRef.current);
    setShowPicture(true);
  };

  const start = async () => {
    if (busy) return;
    setProblem(false);
    let current = ready;
    if (!current) {
      setBusy(true);
      try {
        const { captureLetter } = await import('./captureLetter');
        const { blob } = await captureLetter(data, signed);
        current = { blob, filename: exportFilename(signed.name) };
        if (canceled.current) return;
        setReady(current);
      } catch {
        if (!canceled.current) setProblem(true);
        return;
      } finally {
        if (!canceled.current) setBusy(false);
      }
    }
    const result = await deliver(current.blob, current.filename);
    if (result === 'modal' && !canceled.current) openPicture(current.blob);
  };

  const shareAgain = async () => {
    if (!ready) return;
    const result = await deliver(ready.blob, ready.filename);
    if (result === 'shared') setShowPicture(false);
  };

  return (
    <div className={styles.wrap}>
      {inApp && (
        <p className={styles.hint}>
          For the best download, open this in Safari or Chrome (⋯, then Open in browser).
        </p>
      )}
      <button type="button" className={styles.button} onClick={() => void start()} disabled={busy}>
        {busy ? 'Preparing your letter…' : 'Download your letter'}
      </button>
      <p className={styles.status} role="status" aria-live="polite">
        {busy
          ? 'This can take a few seconds.'
          : problem
            ? "We couldn't prepare your letter. Please try again."
            : ''}
      </p>

      {showPicture && ready && (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Your letter">
          <div className={styles.sheet}>
            <p className={styles.sheetText}>Press and hold the image to save it.</p>
            {pictureUrl && (
              <img className={styles.picture} src={pictureUrl} alt="Your signed letter" />
            )}
            <div className={styles.sheetActions}>
              {canShareFile(ready.blob, ready.filename) && (
                <button type="button" className={styles.button} onClick={() => void shareAgain()}>
                  Save or share
                </button>
              )}
              <button type="button" className={styles.close} onClick={() => setShowPicture(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
