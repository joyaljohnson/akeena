import { z } from 'zod';
import { mediaUrl } from './letterTypes';

/**
 * The groomsmen page's own words and pictures. Dates, places and the chapter list come from the
 * shared letter, so they are only written once; this adds the dress code for each chapter.
 */
const guideChapterSchema = z.object({
  /** Short headline, such as "Cream and white". */
  dressCode: z.string().min(1, 'Please enter the dress code.'),
  /** A line or two about the outfit. */
  details: z.string().optional(),
  /** Colour chips under the dress code. */
  swatches: z
    .array(
      z.object({
        name: z.string().optional(),
        hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Write each colour like: Cream #F5EBD7'),
      }),
    )
    .max(12)
    .optional(),
  /** Outfit pictures from the mood board. */
  looks: z.array(z.object({ url: mediaUrl, alt: z.string().optional() })).max(12),
});

export const guideContentSchema = z.object({
  heading: z.string().min(1, 'Please enter a heading.'),
  intro: z.string(),
  closing: z.string().optional(),
  /** Keyed by the chapter's id in the shared letter (ch1 to ch4). */
  chapters: z.record(z.string(), guideChapterSchema),
  moodboard: z
    .object({
      label: z.string().min(1, 'Please enter a label for the link.'),
      url: z.string().url('Please paste the full link, starting with https://'),
    })
    .optional(),
});

export type GuideContent = z.infer<typeof guideContentSchema>;
export type GuideChapter = z.infer<typeof guideChapterSchema>;
