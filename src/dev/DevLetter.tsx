import { useState } from 'react';
import { fixture } from '../dev-fixture/fixture';
import { HANDWRITING_FONTS } from '../lib/handwriting';
import { Letter } from '../letter/Letter';

export default function DevLetter() {
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
