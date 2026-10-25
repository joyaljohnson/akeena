import { useEffect, useRef, useState } from 'react';
import styles from './CoverBackground.module.css';

type CoverBackgroundProps = { videoUrl: string; posterUrl: string };

/** True when she has asked her phone to move less, or to save data. */
function wantsStill(): boolean {
  if (typeof window === 'undefined') return true;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches || !!nav.connection?.saveData
  );
}

/**
 * A quiet moving picture behind the cover: a still poster first, then a muted looping video fades
 * in over it. An ivory veil keeps the handwriting readable. Reduced motion / data saver get the
 * still poster only.
 */
export function CoverBackground({ videoUrl, posterUrl }: CoverBackgroundProps) {
  const [still] = useState(wantsStill);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = video.current;
    if (!el || still) return;
    const onVisible = () => {
      if (document.hidden) el.pause();
      else void el.play().catch(() => undefined);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [still]);

  return (
    <div className={styles.wrap} aria-hidden="true">
      <img className={styles.media} src={posterUrl} alt="" decoding="async" />
      {!still && !failed && (
        <video
          ref={video}
          className={`${styles.media} ${styles.video} ${playing ? styles.on : ''}`}
          src={videoUrl}
          poster={posterUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          onPlaying={() => setPlaying(true)}
          onError={() => setFailed(true)}
        />
      )}
      <div className={styles.veil} />
    </div>
  );
}
