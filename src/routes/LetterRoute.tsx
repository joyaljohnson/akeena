import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { useParams } from 'react-router-dom';
import { EnvelopeGate } from '../envelope/EnvelopeGate';
import type { UnlockResult } from '../envelope/EnvelopeScene';
import { PhoneStage } from '../letter/PhoneStage';
import { checkLink, signLetter, unlockLetter } from '../lib/api';
import type { SignOutcome } from '../lib/signing';
import { DEFAULT_FONT_ID, handwritingVars } from '../lib/handwriting';
import type { LetterData, SignedInfo } from '../lib/letterTypes';
import { clearPin, readPin, savePin } from '../lib/pinSession';
import type { LetterPayload } from '../lib/rpcSchemas';
import { ConnectionErrorScreen, LoadingScreen, UnavailableScreen } from './StatusScreen';

// The letter's pages are only needed after the PIN, so they load separately and the envelope
// appears sooner. They start downloading as soon as the envelope is on screen.
const loadLetter = () => import('../letter/Letter');
const LetterContent = lazy(() => loadLetter().then((m) => ({ default: m.LetterContent })));

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
    // Warm the letter chunk while she types her PIN, so opening never waits on the network.
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number })
      .requestIdleCallback;
    if (idle) idle(() => void loadLetter());
    else setTimeout(() => void loadLetter(), 800);

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

  const onSign = useCallback(
    async (name: string): Promise<SignOutcome> => {
      const pin = readPin(token);
      if (!pin) return { status: 'blocked' };
      try {
        const res = await signLetter(token, pin, name);
        if (res.status === 'ok' && res.letter.signed) {
          const signed = res.letter.signed;
          setState((s) => (s.kind === 'letter' ? { ...s, payload: res.letter } : s));
          return { status: 'ok', signed };
        }
        if (res.status === 'invalid_name') return { status: 'invalid_name' };
        return { status: 'blocked' };
      } catch {
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
          <div className={state.resumed ? undefined : 'fade-in'} style={{ height: '100%' }}>
            {/* Plain paper while the pages arrive, so nothing from the envelope flashes back. */}
            <Suspense fallback={<div style={{ height: '100%', background: 'var(--paper)' }} />}>
              <LetterContent
                data={toLetterData(state.payload)}
                signed={signed}
                onSign={onSign}
                initialIndex={signed ? 'last' : 0}
              />
            </Suspense>
          </div>
        </PhoneStage>
      );
    }
  }
}
