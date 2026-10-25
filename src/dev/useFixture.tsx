import { useEffect, useState, type ReactNode } from 'react';
import type { LetterData } from '../lib/letterTypes';

// The private design fixture is gitignored, so it only exists on the machine that has it.
// A glob keeps the type-check and the CI build working when the file is absent.
const loaders = import.meta.glob<{ fixture: LetterData }>('../dev-fixture/fixture.ts');

export type FixtureState = LetterData | 'loading' | 'missing';

export function useFixture(): FixtureState {
  const load = Object.values(loaders)[0];
  const [state, setState] = useState<FixtureState>(load ? 'loading' : 'missing');
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
