import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { formatSignedAt } from '../../lib/format';
import type { LetterContent, SignedInfo } from '../../lib/letterTypes';
import {
  cleanSignedName,
  isValidSignedName,
  MAX_NAME_LENGTH,
  type SignOutcome,
} from '../../lib/signing';
import { PetalBurst } from '../PetalBurst';
import { UnionStamp } from '../UnionStamp';
import styles from './pages.module.css';
import sign from './Acceptance.module.css';

type AcceptancePageProps = {
  content: LetterContent;
  /** The signature saved on the server, if this letter was signed before this visit. */
  signed: SignedInfo | null;
  onSign?: (name: string) => Promise<SignOutcome>;
  /** The download control, shown once the letter is signed. */
  downloadSlot?: ReactNode;
  /** The finished page with no buttons, used when drawing the image. */
  exportMode?: boolean;
};

type Step = 'accept' | 'oath' | 'sign';

const MESSAGES: Record<'error' | 'blocked' | 'invalid_name', string> = {
  error: "We couldn't seal your letter. Check your connection and try again.",
  blocked: 'Please reopen your link and enter your PIN again.',
  invalid_name: 'Please enter a name between 1 and 60 characters.',
};

function Check() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <motion.path
        d="m5 12.5 4.5 4.5L19 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
    </svg>
  );
}

/** Size of the name as she types: long names shrink so they stay on one line. */
function nameSize(len: number): string {
  if (len > 34) return '1.05rem';
  if (len > 22) return '1.35rem';
  return '1.8rem';
}

export function AcceptancePage({
  content,
  signed,
  onSign,
  downloadSlot,
  exportMode = false,
}: AcceptancePageProps) {
  const reduce = useReducedMotion() ?? false;
  const [step, setStep] = useState<Step>('accept');
  const [burst, setBurst] = useState(false);
  const [sworn, setSworn] = useState(false);
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<keyof typeof MESSAGES | null>(null);
  const [justSigned, setJustSigned] = useState<SignedInfo | null>(null);
  const inputId = useId();

  const final = signed ?? justSigned;
  const animateStamp = justSigned !== null && !exportMode;

  const accept = () => {
    setStep('oath');
    if (!reduce) setBurst(true);
  };

  const swear = () => {
    setSworn(true);
    setStep('sign');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pending || !onSign || !isValidSignedName(name)) return;
    setPending(true);
    setProblem(null);
    const outcome = await onSign(cleanSignedName(name));
    setPending(false);
    if (outcome.status === 'ok') setJustSigned(outcome.signed);
    else setProblem(outcome.status);
  };

  const valid = isValidSignedName(name);

  return (
    <div className={styles.page}>
      <div className={`${styles.inner} ${sign.inner}`}>
        {burst && <PetalBurst />}
        <h2 className={styles.title}>{content.acceptance.question}</h2>

        {final ? (
          <>
            <p className={styles.oath}>{content.oath}</p>
            <div className={styles.sigBlock}>
              <div className={styles.sigRow}>
                <p className={`hand ${styles.sigName}`}>{final.name}</p>
                <motion.div
                  className={styles.stamp}
                  initial={
                    animateStamp
                      ? reduce
                        ? { opacity: 0 }
                        : { scale: 1.45, opacity: 0, rotate: -14 }
                      : false
                  }
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={
                    reduce
                      ? { duration: 0.3 }
                      : { type: 'spring', stiffness: 420, damping: 19, mass: 0.8, delay: 0.1 }
                  }
                  onAnimationComplete={() => {
                    if (animateStamp) navigator.vibrate?.(25);
                  }}
                >
                  <UnionStamp size={80} />
                  {animateStamp && !reduce && (
                    <motion.span
                      className={sign.thud}
                      initial={{ scale: 0.8, opacity: 0.4 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ delay: 0.32, duration: 0.5, ease: 'easeOut' }}
                    />
                  )}
                </motion.div>
              </div>
              <motion.p
                className={styles.signedAt}
                initial={animateStamp ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                transition={{ delay: animateStamp ? 0.7 : 0, duration: 0.4 }}
              >
                ✅ Signed by {final.name} · {formatSignedAt(final.at)}
              </motion.p>
            </div>
            {!exportMode && downloadSlot && (
              <motion.div
                className={sign.slot}
                initial={animateStamp ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                transition={{ delay: animateStamp ? 1.1 : 0, duration: 0.4 }}
              >
                {downloadSlot}
              </motion.div>
            )}
          </>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            {step === 'accept' ? (
              <motion.div
                key="accept"
                className={sign.stack}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: reduce ? 0 : 0.2 }}
              >
                <button type="button" className={styles.yes} onClick={accept}>
                  {content.acceptance.yesLabel}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="oath"
                className={sign.stack}
                initial={{ opacity: 0, y: reduce ? 0 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduce ? 0 : 0.35 }}
              >
                <p className={styles.oath}>{content.oath}</p>
                {!sworn ? (
                  <button type="button" className={sign.swear} onClick={swear}>
                    I swear 🤞
                  </button>
                ) : (
                  <p className={sign.sworn}>
                    <Check /> Sworn
                  </p>
                )}

                {sworn && (
                  <motion.form
                    className={sign.form}
                    onSubmit={(e) => void submit(e)}
                    initial={{ opacity: 0, y: reduce ? 0 : 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: reduce ? 0 : 0.35 }}
                  >
                    <label htmlFor={inputId} className="sr-only">
                      Your name
                    </label>
                    <input
                      id={inputId}
                      className={`hand ${sign.nameInput}`}
                      style={{ ['--hand-size' as string]: nameSize(name.length) }}
                      value={name}
                      onChange={(e) => setName(e.target.value.slice(0, MAX_NAME_LENGTH))}
                      maxLength={MAX_NAME_LENGTH}
                      placeholder="Your name"
                      autoComplete="name"
                      autoCapitalize="words"
                      spellCheck={false}
                      disabled={pending}
                    />
                    <button type="submit" className={sign.seal} disabled={!valid || pending}>
                      {pending ? 'Sealing…' : 'Seal it'}
                    </button>
                    <p className={sign.problem} role="status" aria-live="polite">
                      {pending ? 'Sealing your letter…' : problem ? MESSAGES[problem] : ''}
                    </p>
                  </motion.form>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
