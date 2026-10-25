import { z } from 'zod';

export const CHAPTER_THEMES = ['pearl', 'jewel', 'gold', 'pastel-metallic'] as const;
export type ChapterTheme = (typeof CHAPTER_THEMES)[number];

const eventSchema = z.object({
  label: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable(),
  timeNote: z.string().optional(),
  venueName: z.string().min(1),
  mapsUrl: z.string().url(),
});

const chapterSchema = z.object({
  id: z.string(),
  number: z.number().int().min(1),
  title: z.string().min(1),
  theme: z.enum(CHAPTER_THEMES),
  events: z.array(eventSchema).min(1).max(2),
  vibe: z.string(),
  dressCode: z.string(),
  dressCodeNote: z.string().optional(),
});

export const letterContentSchema = z.object({
  bride: z.object({ firstName: z.string().min(1), signOff: z.string() }),
  cover: z.object({ headlineTemplate: z.string() }),
  duties: z.object({ title: z.string(), items: z.array(z.string()) }),
  chapters: z.array(chapterSchema),
  closingQuote: z.string(),
  acceptance: z.object({ question: z.string(), yesLabel: z.string() }),
  oath: z.string(),
});

export type LetterContent = z.infer<typeof letterContentSchema>;
export type LetterChapter = z.infer<typeof chapterSchema>;
export type LetterEvent = z.infer<typeof eventSchema>;

/** What the booklet needs to render one bridesmaid's letter. */
export type LetterData = {
  name: string;
  personalNote: string;
  fontId: string;
  content: LetterContent;
};

export type SignedInfo = { name: string; at: string };
