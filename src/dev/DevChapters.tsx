import type { CSSProperties } from 'react';
import { handwritingVars } from '../lib/handwriting';
import { ChaptersPage } from '../letter/pages/ChaptersPage';
import { FixtureGate, useFixture } from './useFixture';

/** The four chapter cards, all open, on the letter's paper at phone width (used to make a PDF). */
export default function DevChapters() {
  const state = useFixture();
  return (
    <FixtureGate state={state}>
      {(data) => (
        <div
          data-palette="river"
          data-chapters-sheet
          style={
            {
              ...handwritingVars(data.fontId),
              width: 390,
              background: 'var(--paper)',
              color: 'var(--ink)',
              paddingBottom: 8,
              '--paper-noise': 'none',
            } as CSSProperties
          }
        >
          <ChaptersPage chapters={data.content.chapters} alwaysOpen />
        </div>
      )}
    </FixtureGate>
  );
}
