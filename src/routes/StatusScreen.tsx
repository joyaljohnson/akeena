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

/** A paper-coloured placeholder shaped like the envelope while the link is checked. */
export function LoadingScreen() {
  return (
    <PhoneStage>
      <div className={styles.screen} role="status" aria-label="Loading your letter">
        <div className={styles.skelEnvelope} />
        <div className={styles.skelRow}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={styles.skelBox} />
          ))}
        </div>
      </div>
    </PhoneStage>
  );
}
