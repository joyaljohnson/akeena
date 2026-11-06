import { useEffect, useState } from 'react';
import { GuidePage } from '../guide/GuidePage';
import type { GuideContent } from '../lib/guideTypes';
import type { GuidePayload } from '../lib/rpcSchemas';
import { sample } from './sampleContent';
import { FixtureGate, useFixture } from './useFixture';

// The private groomsmen words are gitignored; without them a made-up page shows instead.
const loaders = import.meta.glob<{ guideContent: (baseUrl: string) => GuideContent }>(
  '../dev-fixture/guide.ts',
);

function useGuide(): GuideContent | null {
  const load = import.meta.env.VITE_USE_SAMPLE === '1' ? undefined : Object.values(loaders)[0];
  const [content, setContent] = useState<GuideContent | null>(
    load
      ? null
      : {
          heading: 'For the groomsmen',
          intro: 'Four chapters, four looks.',
          chapters: Object.fromEntries(
            sample.content.chapters.map((c) => [c.id, { dressCode: 'Cream and white', looks: [] }]),
          ),
        },
  );
  useEffect(() => {
    if (load)
      void load().then((m) =>
        setContent(m.guideContent(`${import.meta.env.BASE_URL}dev-media/groomsmen/`)),
      );
  }, [load]);
  return content;
}

/** The groomsmen page without the PIN, using local data. Dev only. */
export default function DevGuide() {
  const fixture = useFixture();
  const content = useGuide();
  return (
    <FixtureGate state={content ? fixture : 'loading'}>
      {(data) =>
        content ? (
          <div style={{ maxWidth: 430, margin: '0 auto', height: '100dvh' }} data-palette="river">
            <GuidePage
              payload={
                { font: data.fontId, chapters: data.content.chapters, content } as GuidePayload
              }
            />
          </div>
        ) : null
      }
    </FixtureGate>
  );
}
