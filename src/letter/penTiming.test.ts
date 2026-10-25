import { describe, expect, it } from 'vitest';
import { penSchedule, splitGraphemes } from './penTiming';

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
