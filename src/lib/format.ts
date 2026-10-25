const IST = 'Asia/Kolkata';

/** "2026-12-25" -> "Friday, 25 December 2026". Date-only values are read as UTC so no zone shift. */
export function formatEventDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

/** "2026-12-25" -> "25 Dec 2026". */
export function formatEventDateShort(isoDate: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

/** "18:30" -> "6:30 pm". */
export function formatEventTime(time: string): string {
  const [hh = '0', mm = '0'] = time.split(':');
  const h = Number(hh);
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mm.padStart(2, '0')} ${suffix}`;
}

/** The time line for an event, falling back to the note or a "to be confirmed" line. */
export function describeEventTime(time: string | null, timeNote?: string): string {
  if (time) return timeNote ? `${formatEventTime(time)} · ${timeNote}` : formatEventTime(time);
  return timeNote ?? 'Time to be confirmed';
}

/** UTC instant -> "3 Nov 2026, 3:05 pm" in Asia/Kolkata. */
export function formatSignedAt(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: IST,
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const period = get('dayPeriod').toLowerCase();
  return `${get('day')} ${get('month')} ${get('year')}, ${get('hour')}:${get('minute')} ${period}`;
}

/** Replaces {placeholders}; unknown placeholders are left untouched. */
export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) => values[key] ?? m);
}

const NUMBER_WORDS = [
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
];
export function chapterLabel(n: number): string {
  return `Chapter ${NUMBER_WORDS[n - 1] ?? n}`;
}
