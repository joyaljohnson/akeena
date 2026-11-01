import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { handwritingVars } from '../lib/handwriting';
import { PawIcon } from '../letter/PawIcon';
import { UnionStamp } from '../letter/UnionStamp';
import {
  EnvelopeFrontArt,
  FlapInnerArt,
  FlapOuterArt,
  InteriorArt,
  PocketArt,
  WaxSealArt,
} from './EnvelopeArt';
import type { Recipient } from './recipient';
import styles from './EnvelopeScene.module.css';

type Phase = 'flying' | 'front' | 'flipping' | 'back' | 'opening' | 'opened';

/** How long the front (her name) stays in view before the envelope turns over. */
const FRONT_HOLD_MS = 3000;

type EnvelopeStageProps = {
  /** Called once the opening animation has finished and the letter should take over. */
  onOpened: () => void;
  /** Called straight from the tap on the seal (the moment phones allow sound to start). */
  onSealTap?: () => void;
  fontId: string;
  /** Who the letter is for, written on the front. */
  recipient: Recipient;
};

type Controls = ReturnType<typeof animate>;

/**
 * The animated half of the envelope: the flip, the seal, the opening. It loads in the background
 * while she types her PIN, so the PIN screen itself stays light and appears sooner.
 */
export default function EnvelopeStage({
  onOpened,
  onSealTap,
  fontId,
  recipient,
}: EnvelopeStageProps) {
  const reduce = useReducedMotion() ?? false;
  const [phase, setPhase] = useState<Phase>('flying');
  const [face, setFace] = useState<'front' | 'back'>('front');

  const fly = useMotionValue(reduce ? 1 : 0);
  const flyScale = useTransform(fly, [0, 1], [0.05, 1]);
  const flyX = useTransform(fly, [0, 1], ['38vw', '0vw']);
  const flyY = useTransform(fly, [0, 1], ['-46vh', '0vh']);
  const flyRotate = useTransform(fly, [0, 1], [-32, 0]);
  const flyOpacity = useTransform(fly, [0, 0.22], [0, 1]);
  const flipRot = useMotionValue(0);
  const flapRot = useMotionValue(0);
  const wiggle = useMotionValue(0);
  const peel = useMotionValue(0);
  const glow = useMotionValue(0);
  const lift = useMotionValue(0);
  const letterScale = useMotionValue(1);
  const sceneOpacity = useMotionValue(1);

  const flapZ = useTransform(flapRot, (v) => (v > 90 ? 0 : 4));
  const letterY = useTransform(lift, [0, 1], ['0%', '-66%']);
  const sealY = useTransform(peel, [0, 1], [0, -24]);
  const sealScale = useTransform(peel, [0, 1], [1, 1.12]);
  const sealTilt = useTransform([wiggle, peel], ([w, p]: number[]) => (w ?? 0) + (p ?? 0) * -8);
  const sealOpacity = useTransform(peel, [0, 0.55, 1], [1, 1, 0]);
  // The shadow grows beneath the seal as it lifts away from the paper, then goes with it.
  const shadowOpacity = useTransform(peel, [0, 0.5, 1], [0, 0.55, 0]);
  const shadowScale = useTransform(peel, [0, 1], [0.8, 1.35]);
  const shadowY = useTransform(peel, [0, 1], [0, 14]);
  const glowFront = useTransform(glow, (v) => v * 0.55);

  const active = useRef<Controls[]>([]);
  const skipped = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const controls = active.current;
    return () => {
      mounted.current = false;
      controls.forEach((c) => c.stop());
    };
  }, []);

  const run = useCallback((c: Controls): Controls => {
    active.current.push(c);
    if (skipped.current) c.complete();
    return c;
  }, []);

  // The PIN was right: the envelope flies in from far away, stays face up for a few seconds (a tap
  // moves on sooner), then turns over to show the seal. The flag keeps a cancelled run (React's
  // development mode starts effects twice) from touching the screen.
  const endHold = useRef<(() => void) | null>(null);
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    void (async () => {
      if (!reduce) {
        await run(animate(fly, 1, { duration: 2.1, ease: [0.18, 0.9, 0.25, 1] }));
        if (cancelled) return;
      }
      setPhase('front');
      await new Promise<void>((resolve) => {
        endHold.current = resolve;
        timer = setTimeout(resolve, FRONT_HOLD_MS);
      });
      endHold.current = null;
      if (cancelled) return;
      setPhase('flipping');
      if (reduce) {
        setFace('back');
      } else {
        await run(animate(flipRot, 90, { duration: 0.32, ease: 'easeIn' }));
        if (cancelled) return;
        setFace('back');
        flipRot.set(-90);
        await run(animate(flipRot, 0, { duration: 0.4, ease: 'easeOut' }));
        if (cancelled) return;
      }
      setPhase('back');
    })();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [reduce, run, fly, flipRot]);

  const openEnvelope = useCallback(async () => {
    if (phase !== 'back') return;
    setPhase('opening');
    if (reduce) {
      // No wiggle or lift: the seal simply fades out, then the letter takes over.
      await run(animate(peel, 1, { duration: 0.3 }));
      await run(animate(sceneOpacity, 0, { duration: 0.45 }));
    } else {
      // A small wiggle, then the seal lifts off the flap whole and fades away.
      await run(animate(wiggle, [0, 4, -4, 4, -4, 0], { duration: 0.3, ease: 'linear' }));
      await run(animate(peel, 1, { duration: 0.55, ease: [0.3, 0.1, 0.3, 1] }));
      await Promise.all([
        run(animate(flapRot, 180, { duration: 0.9, ease: [0.45, 0.05, 0.2, 1] })),
        run(animate(glow, 1, { duration: 0.9, delay: 0.45 })),
      ]);
      await run(animate(lift, 1, { duration: 0.9, ease: [0.22, 1, 0.36, 1] }));
      await Promise.all([
        run(animate(letterScale, 1.12, { duration: 0.7 })),
        run(animate(sceneOpacity, 0, { duration: 0.7, delay: 0.15 })),
      ]);
    }
    if (!mounted.current) return;
    setPhase('opened');
    onOpened();
  }, [phase, reduce, run, wiggle, peel, flapRot, glow, lift, letterScale, sceneOpacity, onOpened]);

  // Tapping anywhere during the opening skips to the end.
  const skip = () => {
    if (phase === 'front') endHold.current?.();
    if (phase !== 'opening' || skipped.current) return;
    skipped.current = true;
    active.current.forEach((c) => c.complete());
  };

  return (
    <motion.div
      className={styles.scene}
      style={{
        ...(handwritingVars(recipient.fontId ?? fontId) as CSSProperties),
        opacity: sceneOpacity,
      }}
      onPointerDown={skip}
    >
      <div className={styles.stageCol}>
        <motion.div
          className={styles.flyer}
          style={{ x: flyX, y: flyY, scale: flyScale, rotate: flyRotate, opacity: flyOpacity }}
        >
          <div className={styles.perspective}>
            <motion.div className={styles.flip} style={{ rotateY: flipRot }}>
              {face === 'front' ? (
                <div className={`${styles.envelope} ${reduce ? styles.fadeIn : ''}`}>
                  <EnvelopeFrontArt className={styles.fill} />
                  <UnionStamp className={styles.stamp} size={64} />
                  <div className={styles.address}>
                    <p className={`hand ${styles.recipient}`}>{recipient.name}</p>
                    <p className={`hand ${styles.from}`}>{recipient.from}</p>
                  </div>
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
                  {recipient.sealLine && (
                    <motion.p
                      className={`hand ${styles.sealedBy}`}
                      style={{ opacity: sealOpacity }}
                    >
                      {recipient.sealLine} <PawIcon />
                    </motion.p>
                  )}
                  <motion.div className={styles.glowFront} style={{ opacity: glowFront }} />
                  <motion.div className={styles.flap} style={{ rotateX: flapRot, zIndex: flapZ }}>
                    <div className={`${styles.flapFace} ${styles.flapOuter}`}>
                      <FlapOuterArt className={styles.fill} />
                      <motion.span
                        className={styles.sealShadow}
                        style={{ opacity: shadowOpacity, scale: shadowScale, y: shadowY }}
                      />
                      <motion.span
                        className={styles.sealWrap}
                        style={{
                          y: sealY,
                          scale: sealScale,
                          rotate: sealTilt,
                          opacity: sealOpacity,
                        }}
                      >
                        <WaxSealArt className={styles.sealArt} />
                      </motion.span>
                      <button
                        type="button"
                        className={`${styles.sealButton} ${phase === 'back' ? styles.pulse : ''}`}
                        onClick={() => {
                          onSealTap?.();
                          navigator.vibrate?.(15);
                          void openEnvelope();
                        }}
                        disabled={phase !== 'back'}
                        aria-label={recipient.sealLabel}
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
        </motion.div>
      </div>
    </motion.div>
  );
}
