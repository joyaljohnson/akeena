import { z } from 'zod';

export const CHAPTER_THEMES = ['pearl', 'jewel', 'gold', 'pastel-metallic'] as const;
export type ChapterTheme = (typeof CHAPTER_THEMES)[number];

const required = (what: string) => z.string().min(1, `Please enter ${what}.`);

const eventSchema = z.object({
  label: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please pick a date.'),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Please enter a time like 18:30.')
    .nullable(),
  timeNote: z.string().optional(),
  venueName: required('the venue name'),
  mapsUrl: z.string().url('Please paste a full Google Maps link, starting with https://'),
});

const chapterSchema = z.object({
  id: z.string(),
  number: z.number().int().min(1),
  title: z.string().min(1),
  theme: z.enum(CHAPTER_THEMES),
  /** Optional; falls back to the theme's default icon. */
  icon: z.enum(['home', 'ring', 'sunset', 'bible']).optional(),
  events: z.array(eventSchema).min(1).max(2),
  vibe: required('the vibe'),
  dressCode: required('the colour'),
  dressCodeNote: z.string().optional(),
  /** Inspiration picture under "The colour"; `name` is a file in public/img (without extension). */
  colourImage: z
    .object({ name: z.string(), alt: z.string(), width: z.number(), height: z.number() })
    .optional(),
});

export const letterContentSchema = z.object({
  bride: z.object({ firstName: required('your first name'), signOff: required('a sign-off') }),
  cover: z.object({
    headlineTemplate: required('a headline').refine((h) => h.includes('{name}'), {
      message: 'Include {name} so each cover shows her name.',
    }),
  }),
  duties: z.object({ title: required('a title'), items: z.array(required('the duty')) }),
  chapters: z.array(chapterSchema),
  closingQuote: required('the quote'),
  acceptance: z.object({
    question: required('the question'),
    yesLabel: required('the button text'),
  }),
  oath: required('the oath'),
  /** An optional link under the chapters, such as a Pinterest board for outfit ideas. */
  moodboard: z
    .object({
      label: required('a label for the link'),
      url: z.string().url('Please paste the full link, starting with https://'),
    })
    .optional(),
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
