import { describe, expect, it } from 'vitest';
import { penKeyframes, penSchedule, splitGraphemes } from './penTiming';

describe('splitGraphemes', () => {
  it('keeps emoji and Malayalam letter marks together', () => {
    expect(splitGraphemes('a💖b')).toEqual(['a', '💖', 'b']);
    expect(splitGraphemes('രിയ')).toHaveLength(2); // two letters, the vowel sign stays with its letter
    expect(splitGraphemes('')).toEqual([]);
  });
});

describe('penSchedule', () => {
  const chars = (s: string) => splitGraphemes(s);

  it('starts at zero and only moves forward', () => {
    const { offsets } = penSchedule(chars('Hello there, friend.'));
    expect(offsets[0]).toBe(0);
    for (let i = 1; i < offsets.length; i++) expect(offsets[i]!).toBeGreaterThan(offsets[i - 1]!);
  });

  it('writes at the comfortable pace when the text is short', () => {
    const s = penSchedule(chars('abcdef'), { perCharMs: 50 });
    expect(s.stepMs).toBe(50);
    expect(s.offsets[1]).toBe(50);
  });

  it('pauses longer after a full stop than after a comma', () => {
    const { offsets } = penSchedule(chars('a, b. c'), { perCharMs: 100 });
    const afterComma = offsets[2]! - offsets[1]!; // "," to " "
    const afterStop = offsets[5]! - offsets[4]!; // "." to " "
    expect(afterStop).toBeGreaterThan(afterComma);
  });

  it('speeds a long note up so it never runs past the cap', () => {
    const long = 'Love you more than words can say. '.repeat(18).slice(0, 600);
    const s = penSchedule(chars(long), { perCharMs: 55, maxTotalMs: 14000 });
    expect(s.totalMs).toBeLessThanOrEqual(14000 + 1);
    expect(s.stepMs).toBeLessThan(55);
  });

  it('handles empty text', () => {
    expect(penSchedule([]).offsets).toEqual([]);
  });
});

describe('penKeyframes', () => {
  const pts = [
    { t: 1000, x: 10, y: 50 },
    { t: 1100, x: 22, y: 50 },
    { t: 1200, x: 35, y: 50 },
    { t: 3000, x: 12, y: 90 },
  ];

  it('glides in before the first letter and fades out after the last', () => {
    const { keyframes, durationMs } = penKeyframes(pts, { leadInMs: 500, leadOutMs: 700 });
    expect(durationMs).toBe(3000 + 700 - 500);
    expect(keyframes[0]).toMatchObject({ offset: 0, opacity: 0 });
    expect(keyframes[1]).toMatchObject({ x: 10, y: 50, opacity: 1 });
    expect(keyframes.at(-1)).toMatchObject({ offset: 1, opacity: 0 });
  });

  it('keeps offsets in order between 0 and 1', () => {
    const { keyframes } = penKeyframes(pts);
    for (let i = 1; i < keyframes.length; i++) {
      expect(keyframes[i]!.offset).toBeGreaterThanOrEqual(keyframes[i - 1]!.offset);
      expect(keyframes[i]!.offset).toBeLessThanOrEqual(1);
    }
  });

  it('puts the pen on each point at the matching moment', () => {
    const { keyframes, durationMs } = penKeyframes(pts, { leadInMs: 500, leadOutMs: 700 });
    const third = keyframes.find((k) => k.x === 35)!;
    expect(third.offset).toBeCloseTo((1200 - 500) / durationMs, 5);
  });

  it('handles no points and a single point', () => {
    expect(penKeyframes([]).keyframes).toEqual([]);
    expect(penKeyframes([{ t: 0, x: 1, y: 2 }]).keyframes.length).toBeGreaterThanOrEqual(3);
  });
});
