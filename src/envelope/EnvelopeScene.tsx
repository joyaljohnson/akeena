import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { handwritingVars, loadHandwritingFont } from '../lib/handwriting';
import { UnionStamp } from '../letter/UnionStamp';
import { EnvelopeFrontArt } from './EnvelopeArt';
import styles from './EnvelopeScene.module.css';
import { PinEntry, type PinStatus } from './PinEntry';

export type UnlockResult =
  | { status: 'ok' }
  | { status: 'wrong_pin'; attemptsLeft: number }
  | { status: 'locked'; lockedUntil: string }
  | { status: 'error' };

type EnvelopeSceneProps = {
  /** Checks the PIN. The scene never sees letter content, only the outcome. */
  unlock: (pin: string) => Promise<UnlockResult>;
  /** Called once the opening animation has finished and the letter should take over. */
  onOpened: () => void;
  /** Called straight from the tap on the seal. */
  onSealTap?: () => void;
  /** Start with the link already locked (from the link check). */
  initialLockedUntil?: string;
  /** Handwriting font for "A letter for you" (the default font; the name is not known yet). */
  fontId: string;
};

// The animation code is a separate download that starts as soon as the PIN screen is idle.
const loadStage = () => import('./EnvelopeStage');
const EnvelopeStage = lazy(loadStage);

/** The envelope front with a slot underneath for the PIN boxes. */
function Front({ fontId, children }: { fontId: string; children: ReactNode }) {
  return (
    <div className={styles.scene} style={handwritingVars(fontId) as CSSProperties}>
      <div className={styles.stageCol}>
        <div className={styles.perspective}>
          <div className={styles.flip}>
            <div className={styles.envelope}>
              <EnvelopeFrontArt className={styles.fill} />
              <UnionStamp className={styles.stamp} size={64} />
              <p className={`hand ${styles.greeting}`}>A letter for you</p>
            </div>
          </div>
        </div>
        <div className={styles.pin}>{children}</div>
      </div>
    </div>
  );
}

/**
 * Shown while the link is being checked. It is the same picture as the real PIN screen with the
 * boxes switched off, so nothing jumps when the real screen takes over (and index.html draws a
 * plain copy of it before any script has run).
 */
export function EnvelopeLoading({ fontId }: { fontId: string }) {
  return (
    <div role="status" aria-label="Loading your letter" style={{ height: '100%' }}>
      <Front fontId={fontId}>
        <PinEntry status={{ kind: 'checking' }} onSubmit={() => undefined} />
      </Front>
    </div>
  );
}

/** The envelope front and PIN boxes. Light on purpose: this is what appears first. */
export function EnvelopeScene({
  unlock,
  onOpened,
  onSealTap,
  fontId,
  initialLockedUntil,
}: EnvelopeSceneProps) {
  const [pinStatus, setPinStatus] = useState<PinStatus>(
    initialLockedUntil ? { kind: 'locked', until: initialLockedUntil } : { kind: 'idle' },
  );
  const [pinKey, setPinKey] = useState(0);
  const [animating, setAnimating] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    void loadHandwritingFont(fontId);
    const warm = () => void loadStage();
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number })
      .requestIdleCallback;
    if (idle) idle(warm);
    else setTimeout(warm, 600);
    return () => {
      mounted.current = false;
    };
  }, [fontId]);

  const submitPin = useCallback(
    async (pin: string) => {
      setPinStatus({ kind: 'checking' });
      let result: UnlockResult;
      try {
        result = await unlock(pin);
      } catch {
        result = { status: 'error' };
      }
      if (!mounted.current) return;
      if (result.status === 'wrong_pin') {
        setPinStatus({ kind: 'wrong', attemptsLeft: result.attemptsLeft });
        setPinKey((k) => k + 1);
      } else if (result.status === 'locked') {
        setPinStatus({ kind: 'locked', until: result.lockedUntil });
      } else if (result.status === 'error') {
        setPinStatus({ kind: 'error' });
      } else {
        // Make sure the animation code is here before the envelope turns over.
        await loadStage().catch(() => undefined);
        if (mounted.current) setAnimating(true);
      }
    },
    [unlock],
  );

  if (animating) {
    return (
      <Suspense fallback={null}>
        <EnvelopeStage fontId={fontId} onOpened={onOpened} onSealTap={onSealTap} />
      </Suspense>
    );
  }

  return (
    <Front fontId={fontId}>
      <PinEntry key={pinKey} status={pinStatus} onSubmit={(p) => void submitPin(p)} />
    </Front>
  );
}
