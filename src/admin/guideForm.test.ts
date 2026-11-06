import { describe, expect, it } from 'vitest';
import { guideContentSchema } from '../lib/guideTypes';
import { contentFromForm, emptyForm, formFromContent, textToLooks } from './guideForm';

const IDS = ['ch1', 'ch2'];

describe('guide form', () => {
  it('round-trips saved content', () => {
    const content = guideContentSchema.parse({
      heading: 'For the groomsmen',
      intro: 'Hello',
      closing: 'Bye',
      moodboard: { label: 'Board', url: 'https://example.test/board' },
      chapters: {
        ch1: {
          dressCode: 'Cream',
          details: 'Kurta',
          swatches: [{ name: 'Cream', hex: '#F5EBD7' }],
          looks: [{ url: 'https://example.test/a.webp' }, { url: 'https://example.test/b.webp' }],
        },
      },
    });
    const form = formFromContent(content, IDS);
    expect(form.chapters.ch1?.looks).toBe(
      'https://example.test/a.webp\nhttps://example.test/b.webp',
    );
    expect(form.chapters.ch1?.swatches).toBe('Cream #F5EBD7');
    expect(contentFromForm(form, IDS)).toEqual(content);
  });

  it('leaves a completely empty chapter out and blank optional text absent', () => {
    const content = contentFromForm(emptyForm(IDS), IDS);
    expect(content.chapters).toEqual({});
    expect(content.closing).toBeUndefined();
    expect(content.moodboard).toBeUndefined();
  });

  it('ignores blank picture lines and keeps their order', () => {
    expect(textToLooks('\n https://a.test/1.webp \n\nhttps://a.test/2.webp\n')).toEqual([
      { url: 'https://a.test/1.webp' },
      { url: 'https://a.test/2.webp' },
    ]);
  });

  it('is checked by the same rules as the page: dress code, links and colours', () => {
    const form = emptyForm(IDS);
    form.chapters.ch1 = {
      dressCode: '',
      details: '',
      swatches: 'Cream nope',
      looks: 'not a link',
    };
    const result = guideContentSchema.safeParse(contentFromForm(form, IDS));
    expect(result.success).toBe(false);
    const paths = result.success ? [] : result.error.issues.map((i) => i.path.join('.'));
    expect(paths).toEqual(
      expect.arrayContaining([
        'chapters.ch1.dressCode',
        'chapters.ch1.swatches.0.hex',
        'chapters.ch1.looks.0.url',
      ]),
    );
  });

  it('wants both moodboard boxes or neither', () => {
    const form = emptyForm(IDS);
    form.moodLabel = 'Board';
    const result = guideContentSchema.safeParse(contentFromForm(form, IDS));
    expect(result.success).toBe(false);
  });
});
