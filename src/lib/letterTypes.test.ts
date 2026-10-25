import { describe, expect, it } from 'vitest';
import { letterContentSchema } from './letterTypes';

const base = {
  bride: { firstName: 'A', signOff: 'With love,' },
  cover: { headlineTemplate: '{name}' },
  duties: { title: 'Duties', items: ['x'] },
  chapters: [
    {
      id: 'c1',
      number: 1,
      title: 'T',
      theme: 'pearl',
      events: [
        { date: '2026-12-25', time: null, venueName: 'V', mapsUrl: 'https://example.com/x' },
      ],
      vibe: 'v',
      dressCode: 'd',
    },
  ],
  closingQuote: 'q',
  acceptance: { question: 'Q', yesLabel: 'Y' },
  oath: 'o',
};

describe('letterContentSchema', () => {
  it('accepts valid content with a null time', () => {
    expect(letterContentSchema.safeParse(base).success).toBe(true);
  });

  it('rejects an unknown theme and bad dates', () => {
    const bad = structuredClone(base);
    bad.chapters[0]!.theme = 'neon';
    expect(letterContentSchema.safeParse(bad).success).toBe(false);
    const badDate = structuredClone(base);
    badDate.chapters[0]!.events[0]!.date = '25/12/2026';
    expect(letterContentSchema.safeParse(badDate).success).toBe(false);
  });
});
