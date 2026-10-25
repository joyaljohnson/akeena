import { describe, expect, it } from 'vitest';
import { letterContentSchema, type LetterContent } from '../lib/letterTypes';
import type { BridesmaidRecord, TemplateRecord } from './types';
import {
  bridesmaidStatus,
  buildInviteMessage,
  buildLink,
  generatePin,
  isValidPin,
  issuesByPath,
  move,
  normalizeContent,
  setIn,
  signedCount,
  toLetterData,
  whatsappUrl,
} from './utils';

const content: LetterContent = {
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
const template: TemplateRecord = { content, defaultFont: 'parisienne', whatsappTemplate: 't' };

const base: BridesmaidRecord = {
  id: '1',
  token: 'tok',
  name: 'Riya',
  personalNote: 'note',
  font: null,
  pin: '4821',
  isActive: true,
  sortOrder: 0,
  createdAt: '2026-10-01T00:00:00Z',
  firstOpenedAt: null,
  lastOpenedAt: null,
  openCount: 0,
  signedAt: null,
  signedName: null,
  signedSnapshot: null,
};

describe('status', () => {
  it('is unopened, opened or signed', () => {
    expect(bridesmaidStatus(base)).toBe('unopened');
    expect(bridesmaidStatus({ ...base, openCount: 2, firstOpenedAt: '2026-10-02T00:00:00Z' })).toBe(
      'opened',
    );
    expect(
      bridesmaidStatus({
        ...base,
        openCount: 2,
        signedAt: '2026-10-03T00:00:00Z',
        signedName: 'R',
      }),
    ).toBe('signed');
  });
  it('counts signed letters', () => {
    expect(signedCount([base, { ...base, signedAt: 'x', signedName: 'R' }])).toBe(1);
  });
});

describe('pins', () => {
  it('generates four digits that are not already taken', () => {
    const taken = new Set(['1000', '1001']);
    let calls = 0;
    const pin = generatePin(taken, () => (calls++ < 2 ? 0 : 0.5));
    expect(pin).toMatch(/^\d{4}$/);
    expect(taken.has(pin)).toBe(false);
  });
  it('uses the secure source by default and stays in range', () => {
    for (let i = 0; i < 50; i++)
      expect(Number(generatePin(new Set()))).toBeGreaterThanOrEqual(1000);
  });
  it('validates', () => {
    expect(isValidPin('0123')).toBe(true);
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
  });
});

describe('links and messages', () => {
  it('builds the private link under the base path', () => {
    expect(buildLink('abc', 'https://x.github.io', '/akeena/')).toBe(
      'https://x.github.io/akeena/#/l/abc',
    );
    expect(buildLink('abc', 'https://x.github.io', '/akeena')).toBe(
      'https://x.github.io/akeena/#/l/abc',
    );
    expect(buildLink('abc', 'https://example.com', '/')).toBe('https://example.com/#/l/abc');
  });
  it('fills the invite message and encodes it for WhatsApp', () => {
    const msg = buildInviteMessage('Hi {name}\n{link}\n{pin}', {
      name: 'Riya',
      link: 'https://a/b#/l/t',
      pin: '4821',
    });
    expect(msg).toBe('Hi Riya\nhttps://a/b#/l/t\n4821');
    const url = whatsappUrl(msg);
    expect(url.startsWith('https://wa.me/?text=')).toBe(true);
    expect(decodeURIComponent(url.split('text=')[1] ?? '')).toBe(msg);
  });
});

describe('toLetterData', () => {
  it('uses the shared letter and default font for an unsigned bridesmaid', () => {
    const { data, signed } = toLetterData(base, template);
    expect(data.fontId).toBe('parisienne');
    expect(data.content).toBe(content);
    expect(signed).toBeNull();
  });
  it('uses her own font when set', () => {
    expect(toLetterData({ ...base, font: 'allura' }, template).data.fontId).toBe('allura');
  });
  it('uses the frozen snapshot once signed, even if the shared letter changed', () => {
    const frozen = { ...content, closingQuote: 'what she signed' };
    const b = {
      ...base,
      signedAt: '2026-11-03T09:35:00Z',
      signedName: 'Riya K',
      signedSnapshot: { name: 'Riya', personalNote: 'old note', font: 'allura', content: frozen },
    };
    const { data, signed } = toLetterData(b, {
      ...template,
      content: { ...content, closingQuote: 'new' },
    });
    expect(data.content.closingQuote).toBe('what she signed');
    expect(data.personalNote).toBe('old note');
    expect(data.fontId).toBe('allura');
    expect(signed).toEqual({ name: 'Riya K', at: '2026-11-03T09:35:00Z' });
  });
});

describe('editor helpers', () => {
  it('setIn copies along the path without touching the original', () => {
    const next = setIn(content, ['chapters', 0, 'events', 0, 'venueName'], 'New');
    expect(next.chapters[0]!.events[0]!.venueName).toBe('New');
    expect(content.chapters[0]!.events[0]!.venueName).toBe('V');
    expect(next.chapters).not.toBe(content.chapters);
  });

  it('turns zod issues into messages by path', () => {
    const bad = setIn(content, ['chapters', 0, 'events', 0, 'mapsUrl'], 'nope');
    const res = letterContentSchema.safeParse(bad);
    expect(res.success).toBe(false);
    if (!res.success) {
      const map = issuesByPath(res.error.issues);
      expect(Object.keys(map)).toContain('chapters.0.events.0.mapsUrl');
    }
  });

  it('normalises blank optional fields and blank time', () => {
    const messy = setIn(
      setIn(
        setIn(content, ['chapters', 0, 'dressCodeNote'], '  '),
        ['chapters', 0, 'events', 0, 'timeNote'],
        '',
      ),
      ['chapters', 0, 'events', 0, 'time'],
      '',
    );
    const clean = normalizeContent(messy);
    expect(clean.chapters[0]!.dressCodeNote).toBeUndefined();
    expect(clean.chapters[0]!.events[0]!.timeNote).toBeUndefined();
    expect(clean.chapters[0]!.events[0]!.time).toBeNull();
    expect(letterContentSchema.safeParse(clean).success).toBe(true);
  });

  it('moves items within bounds', () => {
    expect(move(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    expect(move(['a', 'b', 'c'], 2, 3)).toEqual(['a', 'b', 'c']);
    expect(move(['a', 'b', 'c'], 1, 0)).toEqual(['b', 'a', 'c']);
  });
});
