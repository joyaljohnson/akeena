import type { SignedInfo } from './letterTypes';

/** What happens when she presses "Seal it". */
export type SignOutcome =
  | { status: 'ok'; signed: SignedInfo }
  | { status: 'invalid_name' }
  /** The PIN or link no longer works in this tab (locked, deactivated, session lost). */
  | { status: 'blocked' }
  /** Network or server trouble; the name she typed is kept so she can try again. */
  | { status: 'error' };

export const MAX_NAME_LENGTH = 60;

export function cleanSignedName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

export function isValidSignedName(raw: string): boolean {
  const n = cleanSignedName(raw);
  return n.length >= 1 && n.length <= MAX_NAME_LENGTH;
}
