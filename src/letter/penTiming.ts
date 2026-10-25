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

/** Comfortable handwriting pace for the note, and the longest a very long note may take. */
export const PEN_PER_CHAR_MS = 90;
export const PEN_MAX_TOTAL_MS = 24000;

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
  const perChar = opts.perCharMs ?? PEN_PER_CHAR_MS;
  const cap = opts.maxTotalMs ?? PEN_MAX_TOTAL_MS;

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

export type PenPoint = { t: number; x: number; y: number };

export type PenKeyframe = { offset: number; x: number; y: number; opacity: number };

/**
 * Turns the places the pen should be (and when) into animation keyframes. The pen glides in just
 * before the first letter, follows the writing, and fades out a moment after the last one.
 */
export function penKeyframes(
  points: readonly PenPoint[],
  opts: { leadInMs?: number; leadOutMs?: number } = {},
): { keyframes: PenKeyframe[]; durationMs: number } {
  if (points.length === 0) return { keyframes: [], durationMs: 0 };
  const leadIn = opts.leadInMs ?? 500;
  const leadOut = opts.leadOutMs ?? 700;

  const sorted = [...points].sort((a, b) => a.t - b.t);
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const t0 = Math.max(0, first.t - leadIn);
  const end = last.t + leadOut;
  const span = Math.max(1, end - t0);
  const at = (t: number) => Math.min(1, Math.max(0, (t - t0) / span));

  const keyframes: PenKeyframe[] = [{ offset: 0, x: first.x - 14, y: first.y - 10, opacity: 0 }];
  keyframes.push({ offset: at(first.t), x: first.x, y: first.y, opacity: 1 });
  let lastOffset = at(first.t);
  for (const p of sorted.slice(1)) {
    const o = Math.max(lastOffset, at(p.t));
    keyframes.push({ offset: o, x: p.x, y: p.y, opacity: 1 });
    lastOffset = o;
  }
  keyframes.push({ offset: 1, x: last.x + 18, y: last.y - 8, opacity: 0 });
  return { keyframes, durationMs: span };
}

/** How long one letter's reveal lasts; the pen and the letters both use this. */
export function penStrokeMs(schedule: PenSchedule): number {
  return Math.max(280, schedule.stepMs * 4.5);
}

/**
 * When the visible ink's leading edge reaches a letter. A letter's reveal eases in slowly, so the
 * edge arrives a little after the letter's start; the pen's nib is timed to this moment.
 */
export function inkEdgeMs(startOfLetterMs: number, schedule: PenSchedule): number {
  return startOfLetterMs + penStrokeMs(schedule) * 0.3;
}
