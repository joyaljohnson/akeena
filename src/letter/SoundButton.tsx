import { toggleMusic, useMusic } from './music';
import styles from './SoundButton.module.css';

/** Small round button in the corner to turn the music off and on. */
export function SoundButton() {
  const { available, playing } = useMusic();
  if (!available) return null;
  return (
    <button
      type="button"
      className={styles.btn}
      onClick={toggleMusic}
      aria-pressed={playing}
      aria-label={playing ? 'Turn the music off' : 'Turn the music on'}
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
        {playing ? (
          <>
            <path d="M15.5 9a4 4 0 0 1 0 6" />
            <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
          </>
        ) : (
          <path d="m16 9.5 5 5m0-5-5 5" />
        )}
      </svg>
    </button>
  );
}
