import { useState } from 'react';
import { HANDWRITING_FONTS } from '../lib/handwriting';
import type { LetterData } from '../lib/letterTypes';
import { Letter } from '../letter/Letter';
import { FixtureGate, useFixture } from './useFixture';

function Preview({ fixture }: { fixture: LetterData }) {
  const params = new URLSearchParams(location.hash.split('?')[1] ?? '');
  const [signed, setSigned] = useState(params.get('signed') === '1');
  const fontId = params.get('font') ?? fixture.fontId;
  const known = HANDWRITING_FONTS.some((f) => f.id === fontId);
  return (
    <Letter
      data={{ ...fixture, fontId: known ? fontId : fixture.fontId }}
      initialIndex={Number(params.get('page') ?? 0)}
      signed={signed ? { name: 'Riya', at: '2026-11-03T09:35:00Z' } : null}
      onAccept={() => setSigned(true)}
    />
  );
}

export default function DevLetter() {
  const state = useFixture();
  return <FixtureGate state={state}>{(fixture) => <Preview fixture={fixture} />}</FixtureGate>;
}
