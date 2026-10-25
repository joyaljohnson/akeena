import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkLink, NetworkError, signLetter, unlockLetter } from './api';
import { clearPin, readPin, savePin } from './pinSession';

const content = {
  bride: { firstName: 'A', signOff: 'With love,' },
  cover: { headlineTemplate: '{name}' },
  duties: { title: 'Duties', items: ['x'] },
  chapters: [],
  closingQuote: 'q',
  acceptance: { question: 'Q', yesLabel: 'Y' },
  oath: 'o',
};
const letter = { name: 'Riya', personalNote: 'n', font: 'parisienne', content, signed: null };

function respond(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co/');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'sb_publishable_test');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('api', () => {
  it('calls the right endpoint with the key and arguments', async () => {
    const f = respond({ status: 'ok' });
    await checkLink('abc');
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://example.supabase.co/rest/v1/rpc/check_link');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).apikey).toBe('sb_publishable_test');
    expect(JSON.parse(init.body as string)).toEqual({ p_token: 'abc' });
  });

  it('sends the PIN only in the body, never in the URL', async () => {
    const f = respond({ status: 'wrong_pin', attempts_left: 4 });
    const res = await unlockLetter('tok', '1234', false);
    expect(res).toEqual({ status: 'wrong_pin', attempts_left: 4 });
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(url).not.toContain('1234');
    expect(JSON.parse(init.body as string)).toEqual({
      p_token: 'tok',
      p_pin: '1234',
      p_count_view: false,
    });
  });

  it('parses a good letter and a locked response', async () => {
    respond({ status: 'ok', letter });
    expect((await unlockLetter('t', '1234')).status).toBe('ok');
    respond({ status: 'locked', locked_until: '2026-12-01T10:00:00Z' });
    expect(await unlockLetter('t', '1234')).toEqual({
      status: 'locked',
      locked_until: '2026-12-01T10:00:00Z',
    });
  });

  it('parses sign_letter results including invalid_name', async () => {
    respond({ status: 'invalid_name' });
    expect(await signLetter('t', '1234', ' ')).toEqual({ status: 'invalid_name' });
  });

  it('treats HTTP errors, junk and network failures as NetworkError', async () => {
    respond({ message: 'boom' }, { ok: false, status: 500 });
    await expect(checkLink('t')).rejects.toBeInstanceOf(NetworkError);
    respond({ unexpected: true });
    await expect(checkLink('t')).rejects.toBeInstanceOf(NetworkError);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(checkLink('t')).rejects.toBeInstanceOf(NetworkError);
  });

  it('refuses a letter whose content fails validation', async () => {
    respond({ status: 'ok', letter: { ...letter, content: { nope: true } } });
    await expect(unlockLetter('t', '1234')).rejects.toBeInstanceOf(NetworkError);
  });

  it('reports a missing configuration', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    await expect(checkLink('t')).rejects.toBeInstanceOf(NetworkError);
  });
});

describe('pinSession', () => {
  it('stores per token, clears, and survives missing storage', () => {
    const mem = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    });
    savePin('a', '1111');
    savePin('b', '2222');
    expect(readPin('a')).toBe('1111');
    expect(readPin('b')).toBe('2222');
    clearPin('a');
    expect(readPin('a')).toBeNull();
    expect(readPin('b')).toBe('2222');

    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    });
    expect(() => savePin('a', '1')).not.toThrow();
    expect(readPin('a')).toBeNull();
    expect(() => clearPin('a')).not.toThrow();
  });
});
