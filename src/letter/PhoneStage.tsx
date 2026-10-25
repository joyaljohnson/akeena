import type { CSSProperties, ReactNode } from 'react';
import styles from './Letter.module.css';

type PhoneStageProps = { children: ReactNode; style?: CSSProperties };

/** A phone-width paper column, centred on a soft background on larger screens. */
export function PhoneStage({ children, style }: PhoneStageProps) {
  return (
    <div className={styles.stage}>
      <div className={styles.column} style={style}>
        {children}
      </div>
    </div>
  );
}
