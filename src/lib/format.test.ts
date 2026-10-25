import { describe, expect, it } from 'vitest';
import {
  chapterLabel,
  describeEventTime,
  fillTemplate,
  formatEventDate,
  formatEventDateShort,
  formatEventTime,
  formatSignedAt,
} from './format';

describe('format', () => {
  it('computes the weekday from the date', () => {
    expect(formatEventDate('2026-12-25')).toBe('Friday, 25 December 2026');
    expect(formatEventDate('2026-12-27')).toBe('Sunday, 27 December 2026');
    expect(formatEventDate('2027-01-04')).toBe('Monday, 4 January 2027');
    expect(formatEventDate('2027-01-06')).toBe('Wednesday, 6 January 2027');
  });

  it('formats short dates', () => {
    expect(formatEventDateShort('2026-12-25')).toBe('25 Dec 2026');
    expect(formatEventDateShort('2027-01-04')).toBe('4 Jan 2027');
  });

  it('formats times', () => {
    expect(formatEventTime('18:30')).toBe('6:30 pm');
    expect(formatEventTime('15:00')).toBe('3:00 pm');
    expect(formatEventTime('00:05')).toBe('12:05 am');
    expect(formatEventTime('12:00')).toBe('12:00 pm');
  });

  it('falls back when the time is unknown', () => {
    expect(describeEventTime(null)).toBe('Time to be confirmed');
    expect(describeEventTime(null, 'Evening function')).toBe('Evening function');
    expect(describeEventTime('19:00', 'Dinner')).toBe('7:00 pm · Dinner');
  });

  it('shows signing time in IST', () => {
    expect(formatSignedAt('2026-11-03T09:35:00Z')).toBe('3 Nov 2026, 3:05 pm');
    expect(formatSignedAt('2026-11-03T20:00:00Z')).toBe('4 Nov 2026, 1:30 am');
  });

  it('fills placeholders', () => {
    expect(fillTemplate('{name}, hi {x}', { name: 'Riya' })).toBe('Riya, hi {x}');
  });

  it('spells chapter numbers', () => {
    expect(chapterLabel(1)).toBe('Chapter One');
    expect(chapterLabel(4)).toBe('Chapter Four');
  });
});
