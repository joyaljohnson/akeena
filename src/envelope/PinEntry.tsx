import { animate } from 'framer-motion';
import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import styles from './PinEntry.module.css';

export type PinStatus =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'wrong'; attemptsLeft: number }
  | { kind: 'locked'; until: string }
  | { kind: 'error' };

type PinEntryProps = {
  status: PinStatus;
  onSubmit: (pin: string) => void;
};

const LENGTH = 4;

function minutesUntil(iso: string): number {
  return Math.max(1, Math.ceil((new Date(iso).getTime() - Date.now()) / 60000));
}

function messageFor(status: PinStatus): string {
  switch (status.kind) {
    case 'wrong':
      return `That's not quite it, try again. ${status.attemptsLeft} ${status.attemptsLeft === 1 ? 'try' : 'tries'} left.`;
    case 'locked': {
      const m = minutesUntil(status.until);
      return `Too many tries. Try again in ${m} ${m === 1 ? 'minute' : 'minutes'}, or message Akeena.`;
    }
    case 'error':
      return "We couldn't reach your letter. Check your connection and try again.";
    default:
      return '';
  }
}

export function PinEntry({ status, onSubmit }: PinEntryProps) {
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(''));
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const row = useRef<HTMLDivElement>(null);
  const locked = status.kind === 'locked';
  const busy = status.kind === 'checking';
  const disabled = locked || busy;

  // The parent remounts this component (new key) after a wrong PIN, so the boxes start empty;
  // here we only focus the first box and shake the row. A network error keeps what was typed.
  useEffect(() => {
    if (status.kind !== 'wrong') return;
    refs.current[0]?.focus();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce && row.current) {
      void animate(row.current, { x: [0, -10, 9, -6, 4, 0] }, { duration: 0.45 });
    }
  }, [status]);

  const commit = (next: string[]) => {
    setDigits(next);
    if (next.every((d) => d !== '')) onSubmit(next.join(''));
  };

  const setAt = (i: number, value: string) => {
    const next = [...digits];
    next[i] = value;
    commit(next);
  };

  const onChange = (i: number, raw: string) => {
    const only = raw.replace(/\D/g, '');
    if (!only) return setAt(i, '');
    if (only.length > 1) return fill(i, only);
    setAt(i, only);
    if (i < LENGTH - 1) refs.current[i + 1]?.focus();
  };

  const fill = (from: number, text: string) => {
    const next = [...digits];
    [...text.slice(0, LENGTH - from)].forEach((c, k) => {
      next[from + k] = c;
    });
    commit(next);
    refs.current[Math.min(from + text.length, LENGTH - 1)]?.focus();
  };

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      e.preventDefault();
      setAt(i - 1, '');
      refs.current[i - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < LENGTH - 1) refs.current[i + 1]?.focus();
  };

  const onPaste = (i: number, e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!text) return;
    e.preventDefault();
    fill(i, text);
  };

  const message = messageFor(status);

  return (
    <div className={styles.wrap}>
      <div className={styles.row} ref={row} role="group" aria-label="Your 4-digit PIN">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className={styles.box}
            value={d}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            maxLength={LENGTH}
            disabled={disabled}
            aria-label={`PIN digit ${i + 1} of ${LENGTH}`}
            aria-invalid={status.kind === 'wrong'}
            onChange={(e) => onChange(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={(e) => onPaste(i, e)}
            onFocus={(e) => e.target.select()}
          />
        ))}
      </div>
      <p className={styles.message} role="status" aria-live="polite">
        {message}
        {status.kind === 'error' && (
          <>
            {' '}
            <button
              type="button"
              className={styles.retry}
              onClick={() => onSubmit(digits.join(''))}
            >
              Try again
            </button>
          </>
        )}
      </p>
    </div>
  );
}
