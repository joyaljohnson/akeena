/**
 * Keeps the PIN for the current tab only, so a refresh does not force re-entry. sessionStorage is
 * cleared when the tab closes. Never localStorage, never the URL. Storage can be unavailable
 * (private windows, blocked site data), so every call is wrapped and the app works without it.
 */
const key = (token: string) => `pin:${token}`;

function store(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

export function savePin(token: string, pin: string): void {
  try {
    store()?.setItem(key(token), pin);
  } catch {
    /* ignore */
  }
}

export function readPin(token: string): string | null {
  try {
    return store()?.getItem(key(token)) ?? null;
  } catch {
    return null;
  }
}

export function clearPin(token: string): void {
  try {
    store()?.removeItem(key(token));
  } catch {
    /* ignore */
  }
}
