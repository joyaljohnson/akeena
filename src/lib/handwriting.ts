import type { CSSProperties } from 'react';

type HandwritingFont = {
  id: string;
  label: string;
  family: string;
  /** Multiplier on the base script size; script fonts differ wildly in x-height. */
  scale: number;
  lineHeight: number;
  load: () => Promise<unknown>;
};

export const HANDWRITING_FONTS: readonly HandwritingFont[] = [
  {
    id: 'parisienne',
    label: 'Parisienne',
    family: 'Parisienne',
    scale: 1.1,
    lineHeight: 1.3,
    load: () => import('@fontsource/parisienne/400.css'),
  },
  {
    id: 'great-vibes',
    label: 'Great Vibes',
    family: 'Great Vibes',
    scale: 1.22,
    lineHeight: 1.3,
    load: () => import('@fontsource/great-vibes/400.css'),
  },
  {
    id: 'allura',
    label: 'Allura',
    family: 'Allura',
    scale: 1.2,
    lineHeight: 1.3,
    load: () => import('@fontsource/allura/400.css'),
  },
  {
    id: 'pinyon-script',
    label: 'Pinyon Script',
    family: 'Pinyon Script',
    scale: 1.05,
    lineHeight: 1.35,
    load: () => import('@fontsource/pinyon-script/400.css'),
  },
  {
    id: 'alex-brush',
    label: 'Alex Brush',
    family: 'Alex Brush',
    scale: 1.2,
    lineHeight: 1.3,
    load: () => import('@fontsource/alex-brush/400.css'),
  },
  {
    id: 'sacramento',
    label: 'Sacramento',
    family: 'Sacramento',
    scale: 1.2,
    lineHeight: 1.25,
    load: () => import('@fontsource/sacramento/400.css'),
  },
  {
    id: 'dancing-script',
    label: 'Dancing Script',
    family: 'Dancing Script',
    scale: 1.0,
    lineHeight: 1.35,
    load: () => import('@fontsource/dancing-script/500.css'),
  },
  {
    id: 'homemade-apple',
    label: 'Homemade Apple',
    family: 'Homemade Apple',
    scale: 0.78,
    lineHeight: 1.7,
    load: () => import('@fontsource/homemade-apple/400.css'),
  },
];

export const DEFAULT_FONT_ID = 'parisienne';

export function getHandwritingFont(id: string | null | undefined): HandwritingFont {
  const fallback = HANDWRITING_FONTS[0] as HandwritingFont;
  return HANDWRITING_FONTS.find((f) => f.id === id) ?? fallback;
}

/** CSS variables consumed by `.hand` in global.css. */
export function handwritingVars(id: string): CSSProperties {
  const f = getHandwritingFont(id);
  return {
    '--hw-family': `'${f.family}', 'Snell Roundhand', cursive`,
    '--hw-scale': String(f.scale),
    '--hw-lh': String(f.lineHeight),
  } as CSSProperties;
}

/** Loads the font's CSS and files; resolves once the browser has the glyphs. */
export async function loadHandwritingFont(id: string): Promise<void> {
  const f = getHandwritingFont(id);
  await f.load();
  try {
    await document.fonts.load(`1em '${f.family}'`);
  } catch {
    /* serif fallback stays in place */
  }
}
