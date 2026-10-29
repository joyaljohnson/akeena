import { motion } from 'framer-motion';
import styles from './PetalBurst.module.css';

const COLOURS = ['#e4f1ea', '#a9c8b8', '#cfe6db', '#7fb5a0', '#f6fbf8'];
const COUNT = 18;

/** A soft burst of petals (white and greens) lasting about a second. Skipped for reduced motion. */
export function PetalBurst() {
  return (
    <div className={styles.burst} aria-hidden="true">
      {Array.from({ length: COUNT }, (_, i) => {
        // Deterministic spread so the burst looks the same every render.
        const angle = (i / COUNT) * Math.PI * 2 + Math.sin(i * 12.9898) * 0.35;
        const dist = 70 + ((i * 37) % 70);
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist * 0.8 - 20;
        const spin = ((i * 53) % 240) - 120;
        return (
          <motion.span
            key={i}
            className={styles.petal}
            style={{ background: COLOURS[i % COLOURS.length] }}
            initial={{ x: 0, y: 0, opacity: 0.95, scale: 0.5, rotate: 0 }}
            animate={{ x: dx, y: dy + 38, opacity: 0, scale: 1.1, rotate: spin }}
            transition={{ duration: 1.2, ease: [0.16, 0.8, 0.3, 1] }}
          />
        );
      })}
    </div>
  );
}
