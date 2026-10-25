/** Splits text into characters a reader sees as one: emoji and Malayalam letter marks stay whole. */
export function splitGraphemes(text: string): string[] {
  const Seg = (
    Intl as unknown as {
      Segmenter?: new (
        l?: string,
        o?: { granularity: string },
      ) => { segment(s: string): Iterable<{ segment: string }> };
    }
  ).Segmenter;
  if (Seg)
    return Array.from(
      new Seg(undefined, { granularity: 'grapheme' }).segment(text),
      (s) => s.segment,
    );
  return Array.from(text);
}

export type PenOptions = {
  /** Time per letter at a comfortable handwriting pace. */
  perCharMs?: number;
  /** A long note never takes longer than this in total. */
  maxTotalMs?: number;
};

export type PenSchedule = {
  /** When each character starts, in ms from the start of the writing. */
  offsets: number[];
  /** Time per letter after any speed-up. */
  stepMs: number;
  /** When the last letter has started. */
  totalMs: number;
};

const LONG_PAUSE = /[.!?…]/;
const SHORT_PAUSE = /[,;:—–-]/;

/**
 * Gives every character a start time, like a pen: a steady pace, a breath after a comma, a longer
 * one after a full stop or a new line. If the whole thing would run past `maxTotalMs`, every
 * gap shrinks by the same amount so the rhythm is kept.
 */
export function penSchedule(chars: readonly string[], opts: PenOptions = {}): PenSchedule {
  const perChar = opts.perCharMs ?? 55;
  const cap = opts.maxTotalMs ?? 14000;

  // Gap that follows each character, in "steps".
  const gaps = chars.map((c, i) => {
    if (c === '\n') return 6;
    if (c === ' ') return 1.4;
    const next = chars[i + 1];
    if (LONG_PAUSE.test(c) && (next === undefined || next === ' ' || next === '\n')) return 4;
    if (SHORT_PAUSE.test(c)) return 2.2;
    return 1;
  });
  const steps = gaps.reduce((a, b) => a + b, 0);
  const ideal = steps * perChar;
  const stepMs = ideal > cap ? cap / steps : perChar;

  const offsets: number[] = [];
  let t = 0;
  for (const g of gaps) {
    offsets.push(t);
    t += g * stepMs;
  }
  return { offsets, stepMs, totalMs: t };
}
