import type { CSSProperties, ReactNode } from 'react';
import styles from './Letter.module.css';

type PhoneStageProps = {
  children: ReactNode;
  style?: CSSProperties;
  /** Colour scheme. The envelope keeps its cream; the letter uses the green river palette. */
  palette?: 'river';
};

/** A phone-width paper column, centred on a soft background on larger screens. */
export function PhoneStage({ children, style, palette }: PhoneStageProps) {
  return (
    <div className={styles.stage} data-palette={palette}>
      <div className={styles.column} style={style}>
        {children}
      </div>
    </div>
  );
}
