import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useParams } from 'react-router-dom';
import { EnvelopeGate } from '../envelope/EnvelopeGate';
import type { UnlockResult } from '../envelope/EnvelopeScene';
import { LetterContent } from '../letter/Letter';
import { PhoneStage } from '../letter/PhoneStage';
import { checkLink, unlockLetter } from '../lib/api';
import { DEFAULT_FONT_ID, handwritingVars } from '../lib/handwriting';
import type { LetterData, SignedInfo } from '../lib/letterTypes';
import { clearPin, readPin, savePin } from '../lib/pinSession';
import type { LetterPayload } from '../lib/rpcSchemas';
import { ConnectionErrorScreen, LoadingScreen, UnavailableScreen } from './StatusScreen';

type State =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'unavailable' }
  | { kind: 'envelope'; lockedUntil?: string }
  | { kind: 'letter'; payload: LetterPayload; resumed: boolean };

const toLetterData = (p: LetterPayload): LetterData => ({
  name: p.name,
  personalNote: p.personalNote,
  fontId: p.font,
  content: p.content,
});

/** `#/l/:token`. Keyed by token so a different link always starts from scratch. */
export function LetterRoute() {
  const { token = '' } = useParams();
  return <LetterFlow key={token} token={token} />;
}

/** Check the link, resume from a refresh if possible, else show the envelope. */
function LetterFlow({ token }: { token: string }) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  // The unlocked letter waits here while the envelope animation plays.
  const pending = useRef<LetterPayload | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const link = await checkLink(token);
        if (cancelled) return;
        if (link.status === 'unavailable') return setState({ kind: 'unavailable' });
        if (link.status === 'locked')
          return setState({ kind: 'envelope', lockedUntil: link.locked_until });

        // A refresh mid-flow: the PIN lives in this tab only, so skip the envelope.
        const saved = readPin(token);
        if (saved) {
          const res = await unlockLetter(token, saved, false);
          if (cancelled) return;
          if (res.status === 'ok')
            return setState({ kind: 'letter', payload: res.letter, resumed: true });
          clearPin(token);
          if (res.status === 'unavailable') return setState({ kind: 'unavailable' });
        }
        setState({ kind: 'envelope' });
      } catch {
        if (!cancelled) setState({ kind: 'error' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, attempt]);

  const unlock = useCallback(
    async (pin: string): Promise<UnlockResult> => {
      const res = await unlockLetter(token, pin);
      switch (res.status) {
        case 'ok':
          pending.current = res.letter;
          savePin(token, pin);
          return { status: 'ok' };
        case 'wrong_pin':
          return { status: 'wrong_pin', attemptsLeft: res.attempts_left };
        case 'locked':
          clearPin(token);
          return { status: 'locked', lockedUntil: res.locked_until };
        case 'unavailable':
          setState({ kind: 'unavailable' });
          return { status: 'error' };
      }
    },
    [token],
  );

  const handOver = useCallback(() => {
    const payload = pending.current;
    if (payload) setState({ kind: 'letter', payload, resumed: false });
  }, []);

  switch (state.kind) {
    case 'loading':
      return <LoadingScreen />;
    case 'error':
      return (
        <ConnectionErrorScreen
          onRetry={() => {
            setState({ kind: 'loading' });
            setAttempt((n) => n + 1);
          }}
        />
      );
    case 'unavailable':
      return <UnavailableScreen />;
    case 'envelope':
      return (
        <PhoneStage style={handwritingVars(DEFAULT_FONT_ID) as CSSProperties}>
          <EnvelopeGate
            unlock={unlock}
            fontId={DEFAULT_FONT_ID}
            initialLockedUntil={state.lockedUntil}
            onOpened={handOver}
          >
            {null}
          </EnvelopeGate>
        </PhoneStage>
      );
    case 'letter': {
      const signed: SignedInfo | null = state.payload.signed;
      return (
        <PhoneStage style={handwritingVars(state.payload.font) as CSSProperties}>
          <motion.div
            style={{ height: '100%' }}
            initial={state.resumed ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <LetterContent
              data={toLetterData(state.payload)}
              signed={signed}
              initialIndex={signed ? 'last' : 0}
            />
          </motion.div>
        </PhoneStage>
      );
    }
  }
}
