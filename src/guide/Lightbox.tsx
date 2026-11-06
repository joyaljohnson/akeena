import { useEffect, useRef } from 'react';
import styles from './guide.module.css';

export type Look = { url: string; alt: string };

type LightboxProps = {
  looks: readonly Look[];
  index: number;
  onClose: () => void;
  onStep: (next: number) => void;
};

/** One outfit picture at full size, in the browser's own modal dialog (focus and Esc built in). */
export function Lightbox({ looks, index, onClose, onStep }: LightboxProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const look = looks[index];

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  if (!look) return null;
  const many = looks.length > 1;
  const step = (d: number) => onStep((index + d + looks.length) % looks.length);

  return (
    <dialog
      ref={ref}
      className={styles.lightbox}
      aria-label="Outfit picture"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' && many) step(1);
        if (e.key === 'ArrowLeft' && many) step(-1);
      }}
    >
      <div className={styles.lbBody}>
        <img className={styles.lbImg} src={look.url} alt={look.alt} />
        <button type="button" className={`${styles.lbBtn} ${styles.lbClose}`} onClick={onClose}>
          Close
        </button>
        {many && (
          <>
            <button
              type="button"
              className={`${styles.lbBtn} ${styles.lbPrev}`}
              aria-label="Previous picture"
              onClick={() => step(-1)}
            >
              ‹
            </button>
            <span className={styles.lbCount} aria-hidden="true">
              {index + 1} / {looks.length}
            </span>
            <button
              type="button"
              className={`${styles.lbBtn} ${styles.lbNext}`}
              aria-label="Next picture"
              onClick={() => step(1)}
            >
              ›
            </button>
          </>
        )}
      </div>
    </dialog>
  );
}
