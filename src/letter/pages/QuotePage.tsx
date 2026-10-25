import { Flourish } from '../Flourish';
import styles from './pages.module.css';

export function QuotePage({ quote }: { quote: string }) {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Flourish className={styles.flourish} />
        <blockquote className={styles.quote}>{quote.replace(/ — /g, '\u00A0— ')}</blockquote>
        <Flourish className={styles.flourish} />
      </div>
    </div>
  );
}
