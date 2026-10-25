import { useCallback, useState } from 'react';
import type { SignOutcome } from '../lib/signing';
import { HANDWRITING_FONTS } from '../lib/handwriting';
import type { LetterData } from '../lib/letterTypes';
import { Letter } from '../letter/Letter';
import { FixtureGate, useFixture } from './useFixture';

function Preview({ fixture }: { fixture: LetterData }) {
  const params = new URLSearchParams(location.hash.split('?')[1] ?? '');
  const [signed, setSigned] = useState<{ name: string; at: string } | null>(
    params.get('signed') === '1' ? { name: 'Riya', at: '2026-11-03T09:35:00Z' } : null,
  );
  // Mock signing: nothing is saved anywhere. `?fail=1` simulates a network error.
  const onSign = useCallback(
    async (name: string): Promise<SignOutcome> => {
      await new Promise((r) => setTimeout(r, 700));
      if (params.get('fail') === '1') return { status: 'error' };
      const result = { name, at: new Date().toISOString() };
      setSigned(result);
      return { status: 'ok', signed: result };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const fontId = params.get('font') ?? fixture.fontId;
  const known = HANDWRITING_FONTS.some((f) => f.id === fontId);
  return (
    <Letter
      data={{ ...fixture, fontId: known ? fontId : fixture.fontId }}
      initialIndex={Number(params.get('page') ?? 0)}
      signed={signed}
      onSign={onSign}
      writeCover={params.get('write') === '1'}
    />
  );
}

export default function DevLetter() {
  const state = useFixture();
  return <FixtureGate state={state}>{(fixture) => <Preview fixture={fixture} />}</FixtureGate>;
}
