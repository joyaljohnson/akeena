import { fillTemplate } from '../lib/format';
import { letterContentSchema, type LetterContent, type LetterData } from '../lib/letterTypes';
import type { BridesmaidRecord, TemplateRecord } from './types';

export type StatusKind = 'signed' | 'opened' | 'unopened';

export function bridesmaidStatus(b: BridesmaidRecord): StatusKind {
  if (b.signedAt) return 'signed';
  if (b.openCount > 0 || b.firstOpenedAt) return 'opened';
  return 'unopened';
}

export function signedCount(list: readonly BridesmaidRecord[]): number {
  return list.filter((b) => b.signedAt).length;
}

/** A PIN no other bridesmaid has, drawn with the browser's secure random source. */
export function generatePin(
  taken: ReadonlySet<string>,
  random: () => number = secureRandom,
): string {
  for (let i = 0; i < 1000; i++) {
    const pin = String(1000 + Math.floor(random() * 9000));
    if (!taken.has(pin)) return pin;
  }
  throw new Error('No free PINs left');
}

function secureRandom(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] ?? 0) / 0x1_0000_0000;
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/** The private link for one bridesmaid, built from where the app is hosted. */
export function buildLink(token: string, origin: string, basePath: string): string {
  const base = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return `${origin}${base}#/l/${token}`;
}

export function buildInviteMessage(
  template: string,
  values: { name: string; link: string; pin: string },
): string {
  return fillTemplate(template, values);
}

export function whatsappUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/** Turns a record into what the letter components need, using the frozen snapshot if signed. */
export function toLetterData(
  b: BridesmaidRecord,
  template: TemplateRecord,
): { data: LetterData; signed: { name: string; at: string } | null } {
  const signed = b.signedAt && b.signedName ? { name: b.signedName, at: b.signedAt } : null;
  if (signed && b.signedSnapshot) {
    const snap = b.signedSnapshot as {
      name?: string;
      personalNote?: string;
      font?: string;
      content?: unknown;
    };
    const content = letterContentSchema.safeParse(snap.content);
    if (content.success) {
      return {
        data: {
          name: snap.name ?? b.name,
          personalNote: snap.personalNote ?? b.personalNote,
          fontId: snap.font ?? template.defaultFont,
          content: content.data,
        },
        signed,
      };
    }
  }
  return {
    data: {
      name: b.name,
      personalNote: b.personalNote,
      fontId: b.font ?? template.defaultFont,
      content: template.content,
    },
    signed,
  };
}

export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(iso));
}

// ---------------------------------------------------------------------------------------------
// Shared letter editor helpers
// ---------------------------------------------------------------------------------------------

type Path = ReadonlyArray<string | number>;

/** Returns a copy of `obj` with the value at `path` replaced. */
export function setIn<T>(obj: T, path: Path, value: unknown): T {
  if (path.length === 0) return value as T;
  const [head, ...rest] = path as [string | number, ...Array<string | number>];
  const copy: Record<string | number, unknown> = Array.isArray(obj)
    ? ([...obj] as unknown as Record<number, unknown>)
    : { ...(obj as Record<string, unknown>) };
  copy[head] = setIn(copy[head], rest, value);
  return copy as T;
}

/** Reads the value at `path`, or undefined if any step is missing. */
export function getIn(obj: unknown, path: Path): unknown {
  let cur: unknown = obj;
  for (const key of path) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string | number, unknown>)[key];
  }
  return cur;
}

/** zod issues keyed by dotted path ("chapters.1.events.0.mapsUrl"), first message per path. */
export function issuesByPath(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const key = i.path.map(String).join('.');
    if (!(key in out)) out[key] = i.message;
  }
  return out;
}

/** Cleans what the form produced: blank optional text becomes absent, blank time becomes null. */
export function normalizeContent(content: LetterContent): LetterContent {
  const blank = (s: string | undefined) => (s && s.trim() !== '' ? s.trim() : undefined);
  // Both boxes empty means "no moodboard"; one box filled is kept so the editor can ask for the other.
  const label = content.moodboard?.label?.trim() ?? '';
  const url = content.moodboard?.url?.trim() ?? '';
  const bg = content.cover.background;
  const videoUrl = bg?.videoUrl?.trim() ?? '';
  const posterUrl = bg?.posterUrl?.trim() ?? '';
  const musicUrl = bg?.musicUrl?.trim() ?? '';
  const background =
    videoUrl === '' && posterUrl === '' && musicUrl === ''
      ? undefined
      : {
          videoUrl,
          posterUrl,
          musicUrl: musicUrl === '' ? undefined : musicUrl,
          veil: bg?.veil,
          textColour: bg?.textColour,
        };
  return {
    ...content,
    cover: { ...content.cover, background },
    moodboard: label === '' && url === '' ? undefined : { label, url },
    chapters: content.chapters.map((c) => ({
      ...c,
      dressCodeNote: blank(c.dressCodeNote),
      events: c.events.map((e) => ({
        ...e,
        label: blank(e.label),
        timeNote: blank(e.timeNote),
        time: e.time && e.time !== '' ? e.time : null,
      })),
    })),
  };
}

export function move<T>(list: readonly T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return [...list];
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item as T);
  return copy;
}
