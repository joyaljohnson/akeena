import { useEffect, useState, type ReactNode } from 'react';
import type { LetterData } from '../lib/letterTypes';
import { sample } from './sampleContent';

// The private design fixture is gitignored, so it only exists on the machine that has it.
// A glob keeps the type-check and the CI build working when the file is absent.
const loaders = import.meta.glob<{ fixture: LetterData }>('../dev-fixture/fixture.ts');

export type FixtureState = LetterData | 'loading' | 'missing';

export function useFixture(): FixtureState {
  // E2E tests set VITE_USE_SAMPLE=1 so they never depend on the private fixture.
  const load = import.meta.env.VITE_USE_SAMPLE === '1' ? undefined : Object.values(loaders)[0];
  // Without the private fixture, fall back to made-up sample content so previews still work.
  const [state, setState] = useState<FixtureState>(load ? 'loading' : sample);
  useEffect(() => {
    if (load) void load().then((m) => setState(m.fixture));
  }, [load]);
  return state;
}

export function FixtureGate({
  state,
  children,
}: {
  state: FixtureState;
  children: (data: LetterData) => ReactNode;
}) {
  if (state === 'loading') return null;
  if (state === 'missing') return <p style={{ padding: 24 }}>No local fixture on this machine.</p>;
  return <>{children(state)}</>;
}
