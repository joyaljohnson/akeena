import type { CSSProperties } from 'react';
import { EnvelopeLoading } from '../envelope/EnvelopeScene';
import { DEFAULT_FONT_ID, handwritingVars } from '../lib/handwriting';
import { Flourish } from '../letter/Flourish';
import { PhoneStage } from '../letter/PhoneStage';
import styles from './StatusScreen.module.css';

type StatusScreenProps = {
  title: string;
  message: string;
  action?: { label: string; onClick: () => void };
};

/** A calm message on paper, used for links that can't be opened and for network trouble. */
export function StatusScreen({ title, message, action }: StatusScreenProps) {
  return (
    <PhoneStage>
      <main className={styles.screen}>
        <Flourish className={styles.flourish} />
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.message}>{message}</p>
        {action && (
          <button type="button" className={styles.action} onClick={action.onClick}>
            {action.label}
          </button>
        )}
      </main>
    </PhoneStage>
  );
}

export function UnavailableScreen() {
  return <StatusScreen title="This letter isn't available" message="Please reach out to Akeena." />;
}

export function ConnectionErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <StatusScreen
      title="We couldn't reach your letter"
      message="Check your connection and try again."
      action={{ label: 'Try again', onClick: onRetry }}
    />
  );
}

/** The envelope with its PIN boxes switched off, while the link is checked. */
export function LoadingScreen() {
  return (
    <PhoneStage style={handwritingVars(DEFAULT_FONT_ID) as CSSProperties}>
      <EnvelopeLoading fontId={DEFAULT_FONT_ID} />
    </PhoneStage>
  );
}
