import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useParams } from 'react-router-dom';
import { PinEntry, type PinStatus } from '../envelope/PinEntry';
import { PinScreen } from '../envelope/EnvelopeScene';
import { checkGuide, unlockGuide } from '../lib/api';
import { DEFAULT_FONT_ID, handwritingVars, loadHandwritingFont } from '../lib/handwriting';
import { clearPin, readPin, savePin } from '../lib/pinSession';
import type { GuidePayload } from '../lib/rpcSchemas';
import { PhoneStage } from '../letter/PhoneStage';
import { ConnectionErrorScreen, LoadingScreen, StatusScreen } from '../routes/StatusScreen';
import { GuidePage } from './GuidePage';

type State =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'unavailable' }
  | { kind: 'pin'; lockedUntil?: string }
  | { kind: 'page'; payload: GuidePayload };

/** `#/g/:token`. The groomsmen page: one shared link and PIN, nothing shown before the PIN. */
export default function GuideRoute() {
  const { token = '' } = useParams();
  return <GuideFlow key={token} token={token} />;
}

function GuideFlow({ token }: { token: string }) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [pin, setPin] = useState<PinStatus>({ kind: 'idle' });
  const [pinKey, setPinKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void loadHandwritingFont(DEFAULT_FONT_ID).catch(() => undefined);
    (async () => {
      try {
        const link = await checkGuide(token);
        if (cancelled) return;
        if (link.status === 'unavailable') return setState({ kind: 'unavailable' });
        if (link.status === 'locked') {
          setPin({ kind: 'locked', until: link.locked_until });
          return setState({ kind: 'pin', lockedUntil: link.locked_until });
        }
        // A refresh: the PIN lives in this tab only, so skip the PIN screen.
        const saved = readPin(token);
        if (saved) {
          const res = await unlockGuide(token, saved, false);
          if (cancelled) return;
          if (res.status === 'ok') return setState({ kind: 'page', payload: res.guide });
          clearPin(token);
          if (res.status === 'unavailable') return setState({ kind: 'unavailable' });
        }
        setState({ kind: 'pin' });
      } catch {
        if (!cancelled) setState({ kind: 'error' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, attempt]);

  const submit = useCallback(
    async (value: string) => {
      setPin({ kind: 'checking' });
      try {
        const res = await unlockGuide(token, value);
        switch (res.status) {
          case 'ok':
            savePin(token, value);
            return setState({ kind: 'page', payload: res.guide });
          case 'wrong_pin':
            setPin({ kind: 'wrong', attemptsLeft: res.attempts_left });
            return setPinKey((k) => k + 1);
          case 'locked':
            clearPin(token);
            return setPin({ kind: 'locked', until: res.locked_until });
          case 'unavailable':
            return setState({ kind: 'unavailable' });
        }
      } catch {
        setPin({ kind: 'error' });
      }
    },
    [token],
  );

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
      return (
        <StatusScreen title="This page isn't available" message="Please reach out to Akeena." />
      );
    case 'pin':
      return (
        <PhoneStage palette="river" style={handwritingVars(DEFAULT_FONT_ID) as CSSProperties}>
          <PinScreen fontId={DEFAULT_FONT_ID}>
            <PinEntry key={pinKey} status={pin} onSubmit={(v) => void submit(v)} />
          </PinScreen>
        </PhoneStage>
      );
    case 'page':
      return (
        <PhoneStage palette="river" style={handwritingVars(state.payload.font) as CSSProperties}>
          <GuidePage payload={state.payload} />
        </PhoneStage>
      );
  }
}
