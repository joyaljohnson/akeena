import type { GuideContent } from '../lib/guideTypes';
import { swatchesToText, textToSwatches } from './utils';

/** What the groomsmen editor keeps while she types: plain text boxes, turned into content on demand. */
export type GuideForm = {
  heading: string;
  intro: string;
  closing: string;
  moodLabel: string;
  moodUrl: string;
  chapters: Record<string, { dressCode: string; details: string; swatches: string; looks: string }>;
};

export const DEFAULT_HEADING = 'For the groomsmen';

export function emptyForm(chapterIds: readonly string[]): GuideForm {
  return {
    heading: DEFAULT_HEADING,
    intro: '',
    closing: '',
    moodLabel: '',
    moodUrl: '',
    chapters: Object.fromEntries(
      chapterIds.map((id) => [id, { dressCode: '', details: '', swatches: '', looks: '' }]),
    ),
  };
}

export function formFromContent(
  content: GuideContent | null,
  chapterIds: readonly string[],
): GuideForm {
  if (!content) return emptyForm(chapterIds);
  return {
    heading: content.heading,
    intro: content.intro,
    closing: content.closing ?? '',
    moodLabel: content.moodboard?.label ?? '',
    moodUrl: content.moodboard?.url ?? '',
    chapters: Object.fromEntries(
      chapterIds.map((id) => {
        const c = content.chapters[id];
        return [
          id,
          {
            dressCode: c?.dressCode ?? '',
            details: c?.details ?? '',
            swatches: swatchesToText(c?.swatches),
            looks: (c?.looks ?? []).map((l) => l.url).join('\n'),
          },
        ];
      }),
    ),
  };
}

/** Pictures: one link per line, in the order they are shown. Blank lines are ignored. */
export function textToLooks(raw: string): Array<{ url: string }> {
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '')
    .map((url) => ({ url }));
}

/** Content for validation and saving. Blank optional text is left out; blank chapters are kept off. */
export function contentFromForm(form: GuideForm, chapterIds: readonly string[]): GuideContent {
  const blank = (s: string) => (s.trim() === '' ? undefined : s.trim());
  const label = form.moodLabel.trim();
  const url = form.moodUrl.trim();
  const chapters: GuideContent['chapters'] = {};
  for (const id of chapterIds) {
    const c = form.chapters[id];
    // A chapter left completely empty has no dress-code section at all.
    if (!c || Object.values(c).every((v) => v.trim() === '')) continue;
    const swatches = textToSwatches(c.swatches);
    chapters[id] = {
      dressCode: c.dressCode.trim(),
      details: blank(c.details),
      swatches: swatches.length > 0 ? swatches : undefined,
      looks: textToLooks(c.looks),
    };
  }
  return {
    heading: form.heading.trim(),
    intro: form.intro.trim(),
    closing: blank(form.closing),
    chapters,
    moodboard: label === '' && url === '' ? undefined : { label, url },
  };
}
