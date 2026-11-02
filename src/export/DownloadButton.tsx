import { useEffect, useRef, useState } from 'react';
import type { LetterData, SignedInfo } from '../lib/letterTypes';
import { deliver, canShareFile } from './deliver';
import styles from './DownloadButton.module.css';
import { exportFilename, isInAppBrowser } from './utils';

type DownloadButtonProps = { data: LetterData; signed: SignedInfo };

type Kind = 'png' | 'pdf';
type Ready = { blob: Blob; filename: string };

export function DownloadButton({ data, signed }: DownloadButtonProps) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(false);
  const [ready, setReady] = useState<Partial<Record<Kind, Ready>>>({});
  const [shown, setShown] = useState<Kind>('png');
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

  const start = async (kind: Kind) => {
    if (busy) return;
    setProblem(false);
    setShown(kind);
    let current = ready[kind];
    if (!current) {
      setBusy(true);
      try {
        const { captureLetter } = await import('./captureLetter');
        const picture = await captureLetter(data, signed);
        if (canceled.current) return;
        const png = { blob: picture.blob, filename: exportFilename(signed.name) };
        let pdf: Ready | undefined;
        if (kind === 'pdf') {
          const { pictureToPdf } = await import('./pdf');
          pdf = {
            blob: await pictureToPdf(picture.blob, picture.width, picture.height),
            filename: exportFilename(signed.name, 'pdf'),
          };
        }
        current = kind === 'pdf' ? pdf : png;
        if (canceled.current) return;
        setReady((r) => ({ ...r, png: r.png ?? png, ...(pdf ? { pdf } : {}) }));
      } catch {
        if (!canceled.current) setProblem(true);
        return;
      } finally {
        if (!canceled.current) setBusy(false);
      }
    }
    if (!current) return;
    const result = await deliver(current.blob, current.filename);
    if (result === 'modal' && !canceled.current) {
      if (kind === 'pdf') window.open(URL.createObjectURL(current.blob), '_blank');
      else openPicture(current.blob);
    }
  };

  const shareAgain = async () => {
    const current = ready[shown];
    if (!current) return;
    const result = await deliver(current.blob, current.filename);
    if (result === 'shared') setShowPicture(false);
  };

  return (
    <div className={styles.wrap}>
      {inApp && (
        <p className={styles.hint}>
          For the best download, open this in Safari or Chrome (⋯, then Open in browser).
        </p>
      )}
      <button
        type="button"
        className={styles.button}
        onClick={() => void start('png')}
        disabled={busy}
      >
        {busy ? 'Preparing your letter…' : 'Download your letter'}
      </button>
      <button
        type="button"
        className={styles.button}
        onClick={() => void start('pdf')}
        disabled={busy}
      >
        Download as PDF
      </button>
      <p className={styles.status} role="status" aria-live="polite">
        {busy
          ? 'This can take a few seconds.'
          : problem
            ? "We couldn't prepare your letter. Please try again."
            : ''}
      </p>

      {showPicture && ready.png && (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Your letter">
          <div className={styles.sheet}>
            <p className={styles.sheetText}>Press and hold the image to save it.</p>
            {pictureUrl && (
              <img className={styles.picture} src={pictureUrl} alt="Your signed letter" />
            )}
            <div className={styles.sheetActions}>
              {canShareFile(ready.png.blob, ready.png.filename) && (
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
