import { describe, expect, it } from 'vitest';
import { letterContentSchema } from './letterTypes';
import { petLines } from './pet';

const pet = { name: 'Loki', sealLine: 'Sealed by {pet}', witnessLine: 'Witnessed by {pet}' };

describe('petLines', () => {
  it('fills in {pet}', () => {
    expect(petLines({ pet: { ...pet, enabled: true } })).toEqual({
      name: 'Loki',
      sealLine: 'Sealed by Loki',
      witnessLine: 'Witnessed by Loki',
    });
  });
  it('is null when switched off or absent', () => {
    expect(petLines({ pet: { ...pet, enabled: false } })).toBeNull();
    expect(petLines({})).toBeNull();
  });
});

describe('pet in the letter schema', () => {
  const content = {
    bride: { firstName: 'A', signOff: 'With love,' },
    cover: { headlineTemplate: '{name}' },
    duties: { title: 'Duties', items: ['x'] },
    chapters: [
      {
        id: 'c1',
        number: 1,
        title: 'T',
        theme: 'pearl',
        events: [{ date: '2026-12-25', time: null, venueName: 'V', mapsUrl: 'https://e.com/x' }],
        vibe: 'v',
        dressCode: 'd',
      },
    ],
    closingQuote: 'q',
    acceptance: { question: 'Q', yesLabel: 'Y' },
    oath: 'o',
  };
  it('accepts a pet block, and content without one', () => {
    expect(
      letterContentSchema.safeParse({ ...content, pet: { ...pet, enabled: true } }).success,
    ).toBe(true);
    expect(letterContentSchema.safeParse(content).success).toBe(true);
  });
  it('rejects a pet with no name or a missing switch', () => {
    expect(
      letterContentSchema.safeParse({ ...content, pet: { ...pet, name: '', enabled: true } })
        .success,
    ).toBe(false);
    expect(letterContentSchema.safeParse({ ...content, pet }).success).toBe(false);
  });
});
