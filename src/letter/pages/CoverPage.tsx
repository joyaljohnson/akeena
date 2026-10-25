import { fillTemplate } from '../../lib/format';
import type { LetterData } from '../../lib/letterTypes';
import { FloralCorner } from '../FloralCorner';
import styles from './pages.module.css';

export function CoverPage({ data }: { data: LetterData }) {
  const { content } = data;
  const headline = fillTemplate(content.cover.headlineTemplate, { name: data.name });
  return (
    <div className={styles.page}>
      <div className={`${styles.inner} ${styles.cover}`}>
        <FloralCorner className={`${styles.corner} ${styles.cornerTl}`} />
        <FloralCorner className={`${styles.corner} ${styles.cornerBr}`} />
        <h1 className={`hand ${styles.headline}`}>{headline}</h1>
        <p className={`hand ${styles.note}`}>{data.personalNote}</p>
        <p className={`hand ${styles.signoff}`}>
          {content.bride.signOff}
          <br />
          {content.bride.firstName}
        </p>
        <p className={styles.scrollHint} aria-hidden="true">
          Scroll ↓
        </p>
      </div>
    </div>
  );
}
