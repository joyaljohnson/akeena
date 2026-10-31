import { useCallback, useRef } from 'react';
import { EnvelopeGate } from '../envelope/EnvelopeGate';
import type { UnlockResult } from '../envelope/EnvelopeScene';
import { LetterContent } from '../letter/Letter';
import { PhoneStage } from '../letter/PhoneStage';
import { DEFAULT_FONT_ID, handwritingVars } from '../lib/handwriting';
import type { CSSProperties } from 'react';
import type { LetterData } from '../lib/letterTypes';
import { FixtureGate, useFixture } from './useFixture';

const PIN = '1234';

/** Mock unlock: PIN 1234 opens, 5 wrong tries lock for 15 minutes. `?pin=ok` skips the wait. */
function Preview({ fixture }: { fixture: LetterData }) {
  const failed = useRef(0);
  const lockedUntil = useRef<string | null>(null);
  const unlock = useCallback(async (pin: string): Promise<UnlockResult> => {
    await new Promise((r) => setTimeout(r, 350));
    if (lockedUntil.current && new Date(lockedUntil.current) > new Date()) {
      return { status: 'locked', lockedUntil: lockedUntil.current };
    }
    if (pin === PIN) return { status: 'ok' };
    if (pin === '0000') return { status: 'error' };
    failed.current += 1;
    if (failed.current >= 5) {
      failed.current = 0;
      lockedUntil.current = new Date(Date.now() + 15 * 60000).toISOString();
      return { status: 'locked', lockedUntil: lockedUntil.current };
    }
    return { status: 'wrong_pin', attemptsLeft: 5 - failed.current };
  }, []);

  return (
    <PhoneStage palette="river" style={handwritingVars(DEFAULT_FONT_ID) as CSSProperties}>
      <EnvelopeGate
        unlock={unlock}
        fontId={DEFAULT_FONT_ID}
        getRecipient={() => ({
          name: fixture.name,
          from: `${fixture.content.bride.signOff} ${fixture.content.bride.firstName}`,
          fontId: fixture.fontId,
        })}
      >
        <div style={{ height: '100%', ...(handwritingVars(fixture.fontId) as CSSProperties) }}>
          <LetterContent data={fixture} />
        </div>
      </EnvelopeGate>
    </PhoneStage>
  );
}

export default function DevEnvelope() {
  const state = useFixture();
  return <FixtureGate state={state}>{(fixture) => <Preview fixture={fixture} />}</FixtureGate>;
}
