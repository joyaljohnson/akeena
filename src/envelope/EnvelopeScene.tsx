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
import { Flourish } from '../letter/Flourish';
import styles from './EnvelopeScene.module.css';
import { PinEntry, type PinStatus } from './PinEntry';
import type { Recipient } from './recipient';

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
  /** Read after the PIN was right: the name and sender written on the envelope's front. */
  getRecipient: () => Recipient | null;
};

// The animation code is a separate download that starts as soon as the PIN screen is idle.
const loadStage = () => import('./EnvelopeStage');
const EnvelopeStage = lazy(loadStage);

/** The first screen: a plain page with a greeting and the PIN boxes. The envelope comes later. */
function PinScreen({ fontId, children }: { fontId: string; children: ReactNode }) {
  return (
    <div className={styles.scene} style={handwritingVars(fontId) as CSSProperties}>
      <div className={styles.pinScreen}>
        <h1 className={`hand ${styles.heading}`}>A letter for you</h1>
        <Flourish className={styles.headingFlourish} />
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
      <PinScreen fontId={fontId}>
        <PinEntry status={{ kind: 'checking' }} onSubmit={() => undefined} />
      </PinScreen>
    </div>
  );
}

/** The envelope front and PIN boxes. Light on purpose: this is what appears first. */
export function EnvelopeScene({
  unlock,
  onOpened,
  onSealTap,
  fontId,
  getRecipient,
  initialLockedUntil,
}: EnvelopeSceneProps) {
  const [pinStatus, setPinStatus] = useState<PinStatus>(
    initialLockedUntil ? { kind: 'locked', until: initialLockedUntil } : { kind: 'idle' },
  );
  const [pinKey, setPinKey] = useState(0);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
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
        const who = getRecipient() ?? { name: '', from: '' };
        // Her handwriting for the name on the envelope, but never wait long for it.
        await Promise.all([
          loadStage().catch(() => undefined),
          Promise.race([
            loadHandwritingFont(who.fontId ?? fontId).catch(() => undefined),
            new Promise((r) => setTimeout(r, 1500)),
          ]),
        ]);
        if (mounted.current) setRecipient(who);
      }
    },
    [unlock, getRecipient, fontId],
  );

  if (recipient) {
    return (
      <Suspense fallback={null}>
        <EnvelopeStage
          fontId={fontId}
          onOpened={onOpened}
          onSealTap={onSealTap}
          recipient={recipient}
        />
      </Suspense>
    );
  }

  return (
    <PinScreen fontId={fontId}>
      <PinEntry key={pinKey} status={pinStatus} onSubmit={(p) => void submitPin(p)} />
    </PinScreen>
  );
}
