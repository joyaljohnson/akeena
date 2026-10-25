import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { handwritingVars, loadHandwritingFont } from '../lib/handwriting';
import { UnionStamp } from '../letter/UnionStamp';
import {
  EnvelopeFrontArt,
  FlapFloralsArt,
  FlapInnerArt,
  FlapOuterArt,
  InteriorArt,
  PocketArt,
  WaxSealArt,
} from './EnvelopeArt';
import styles from './EnvelopeScene.module.css';
import { PinEntry, type PinStatus } from './PinEntry';

export type UnlockResult =
  | { status: 'ok' }
  | { status: 'wrong_pin'; attemptsLeft: number }
  | { status: 'locked'; lockedUntil: string }
  | { status: 'error' };

type Phase = 'front' | 'flipping' | 'back' | 'opening' | 'opened';

type EnvelopeSceneProps = {
  /** Checks the PIN. The scene never sees letter content, only the outcome. */
  unlock: (pin: string) => Promise<UnlockResult>;
  /** Called once the opening animation has finished and the letter should take over. */
  onOpened: () => void;
  /** Handwriting font for "A letter for you" (the default font; the name is not known yet). */
  fontId: string;
};

type Controls = ReturnType<typeof animate>;

export function EnvelopeScene({ unlock, onOpened, fontId }: EnvelopeSceneProps) {
  const reduce = useReducedMotion() ?? false;
  const [phase, setPhase] = useState<Phase>('front');
  const [face, setFace] = useState<'front' | 'back'>('front');
  const [pinStatus, setPinStatus] = useState<PinStatus>({ kind: 'idle' });
  const [pinKey, setPinKey] = useState(0);

  const flipRot = useMotionValue(0);
  const flapRot = useMotionValue(0);
  const crack = useMotionValue(0);
  const glow = useMotionValue(0);
  const lift = useMotionValue(0);
  const letterScale = useMotionValue(1);
  const sceneOpacity = useMotionValue(1);

  const flapZ = useTransform(flapRot, (v) => (v > 90 ? 0 : 4));
  const letterY = useTransform(lift, [0, 1], ['0%', '-66%']);
  const sealLeftX = useTransform(crack, [0, 1], [0, -12]);
  const sealRightX = useTransform(crack, [0, 1], [0, 12]);
  const sealLeftR = useTransform(crack, [0, 1], [0, -14]);
  const sealRightR = useTransform(crack, [0, 1], [0, 14]);
  const sealOpacity = useTransform(crack, [0, 0.7, 1], [1, 1, 0]);
  const glowFront = useTransform(glow, (v) => v * 0.55);

  const active = useRef<Controls[]>([]);
  const skipped = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    void loadHandwritingFont(fontId);
    const controls = active.current;
    return () => {
      mounted.current = false;
      controls.forEach((c) => c.stop());
    };
  }, [fontId]);

  const run = useCallback((c: Controls): Controls => {
    active.current.push(c);
    if (skipped.current) c.complete();
    return c;
  }, []);

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
        setPhase('flipping');
        if (reduce) {
          setFace('back');
        } else {
          await run(animate(flipRot, 90, { duration: 0.32, ease: 'easeIn' }));
          setFace('back');
          flipRot.set(-90);
          await run(animate(flipRot, 0, { duration: 0.4, ease: 'easeOut' }));
        }
        if (mounted.current) setPhase('back');
      }
    },
    [unlock, reduce, run, flipRot],
  );

  const openEnvelope = useCallback(async () => {
    if (phase !== 'back') return;
    setPhase('opening');
    if (reduce) {
      await run(animate(sceneOpacity, 0, { duration: 0.45 }));
    } else {
      await run(animate(crack, 1, { duration: 0.5, ease: 'easeOut' }));
      await Promise.all([
        run(animate(flapRot, 180, { duration: 0.95, ease: [0.45, 0.05, 0.2, 1] })),
        run(animate(glow, 1, { duration: 0.9, delay: 0.45 })),
      ]);
      await run(animate(lift, 1, { duration: 1, ease: [0.22, 1, 0.36, 1] }));
      await Promise.all([
        run(animate(letterScale, 1.12, { duration: 0.7 })),
        run(animate(sceneOpacity, 0, { duration: 0.7, delay: 0.15 })),
      ]);
    }
    if (!mounted.current) return;
    setPhase('opened');
    onOpened();
  }, [phase, reduce, run, crack, flapRot, glow, lift, letterScale, sceneOpacity, onOpened]);

  // Tapping anywhere during the opening skips to the end.
  const skip = () => {
    if (phase !== 'opening' || skipped.current) return;
    skipped.current = true;
    active.current.forEach((c) => c.complete());
  };

  const pinMounted = face === 'front';
  const pinVisible = phase === 'front';

  return (
    <motion.div
      className={styles.scene}
      style={{ ...(handwritingVars(fontId) as CSSProperties), opacity: sceneOpacity }}
      onPointerDown={skip}
    >
      <div className={styles.stageCol}>
        <div className={styles.perspective}>
          <motion.div className={styles.flip} style={{ rotateY: flipRot }}>
            {face === 'front' ? (
              <div className={`${styles.envelope} ${reduce ? styles.fadeIn : ''}`}>
                <EnvelopeFrontArt className={styles.fill} />
                <UnionStamp className={styles.stamp} size={64} />
                <p className={`hand ${styles.greeting}`}>A letter for you</p>
              </div>
            ) : (
              <div className={`${styles.envelope} ${styles.back} ${reduce ? styles.fadeIn : ''}`}>
                <InteriorArt className={`${styles.fill} ${styles.zInterior}`} />
                <motion.div className={styles.glowBack} style={{ opacity: glow }} />
                <motion.div
                  className={styles.letter}
                  style={{ y: letterY, scale: letterScale }}
                  aria-hidden="true"
                >
                  <span className={styles.letterRule} />
                  <span className={styles.letterRule} />
                  <span className={styles.letterRule} />
                </motion.div>
                <PocketArt className={`${styles.fill} ${styles.zPocket}`} />
                <motion.div className={styles.glowFront} style={{ opacity: glowFront }} />
                <motion.div className={styles.flap} style={{ rotateX: flapRot, zIndex: flapZ }}>
                  <div className={`${styles.flapFace} ${styles.flapOuter}`}>
                    <FlapOuterArt className={styles.fill} />
                    <FlapFloralsArt className={styles.florals} />
                    <motion.span
                      className={styles.sealHalf}
                      style={{ x: sealLeftX, rotate: sealLeftR, opacity: sealOpacity }}
                    >
                      <WaxSealArt className={`${styles.sealArt} ${styles.sealLeft}`} />
                    </motion.span>
                    <motion.span
                      className={styles.sealHalf}
                      style={{ x: sealRightX, rotate: sealRightR, opacity: sealOpacity }}
                    >
                      <WaxSealArt className={`${styles.sealArt} ${styles.sealRight}`} />
                    </motion.span>
                    <button
                      type="button"
                      className={`${styles.sealButton} ${phase === 'back' ? styles.pulse : ''}`}
                      onClick={() => void openEnvelope()}
                      disabled={phase !== 'back'}
                      aria-label="Open your letter"
                    />
                  </div>
                  <div className={`${styles.flapFace} ${styles.flapInner}`}>
                    <FlapInnerArt className={styles.fill} />
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        </div>

        <div
          className={`${styles.pin} ${pinVisible ? '' : styles.pinHidden}`}
          aria-hidden={!pinVisible}
        >
          {pinMounted && (
            <PinEntry key={pinKey} status={pinStatus} onSubmit={(p) => void submitPin(p)} />
          )}
        </div>
      </div>
    </motion.div>
  );
}
