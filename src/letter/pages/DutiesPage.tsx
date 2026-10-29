import type { LetterContent } from '../../lib/letterTypes';
import { Flourish, HeartBullet } from '../Flourish';
import styles from './pages.module.css';

export function DutiesPage({ content }: { content: LetterContent }) {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h2 className={styles.title}>{content.duties.title}</h2>
        <Flourish className={styles.flourish} />
        <ul className={styles.duties}>
          {content.duties.items.map((item) => (
            <li key={item} className={styles.duty}>
              <HeartBullet />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
