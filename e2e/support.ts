import type { Page, Route } from '@playwright/test';
import { sample } from '../src/dev/sampleContent';

export const TOKEN = '0123456789abcdef0123456789abcdef01234567';
export const PIN = '4821';
export const SIGNED_AT = '2026-11-03T09:35:00Z'; // 3 Nov 2026, 3:05 pm in India

export const letter = (overrides: Record<string, unknown> = {}) => ({
  name: 'Riya',
  personalNote: 'You have been my person from day one.',
  font: 'parisienne',
  content: sample.content,
  signed: null,
  ...overrides,
});

type Handlers = {
  check?: () => unknown;
  unlock?: (pin: string, countView: boolean) => unknown;
  sign?: (pin: string, name: string) => unknown;
};

/** Answers the three public database calls so the app runs with no real backend. */
export async function mockBackend(page: Page, handlers: Handlers = {}) {
  const calls: Array<{ fn: string; body: Record<string, unknown> }> = [];
  const attempts = { wrong: 0 };

  // The sample letter points at media that does not exist; answer with nothing and keep it silent.
  await page.route('https://media.example.test/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/octet-stream', body: '' }),
  );
  await page.addInitScript(() => {
    (window as unknown as { __played: string[] }).__played = [];
    HTMLMediaElement.prototype.play = function () {
      (window as unknown as { __played: string[] }).__played.push(this.currentSrc || this.src);
      return Promise.resolve();
    };
  });
  await page.route('https://e2e.supabase.test/rest/v1/rpc/*', async (route: Route) => {
    const fn = route.request().url().split('/rpc/')[1] ?? '';
    const body = (route.request().postDataJSON() ?? {}) as Record<string, unknown>;
    calls.push({ fn, body });
    let result: unknown = { status: 'unavailable' };
    if (fn === 'check_link') result = handlers.check?.() ?? { status: 'ok' };
    if (fn === 'unlock_letter') {
      const pin = String(body.p_pin);
      result =
        handlers.unlock?.(pin, body.p_count_view !== false) ??
        (pin === PIN
          ? { status: 'ok', letter: letter() }
          : { status: 'wrong_pin', attempts_left: 4 - attempts.wrong++ });
    }
    if (fn === 'sign_letter') {
      result = handlers.sign?.(String(body.p_pin), String(body.p_signed_name)) ?? {
        status: 'ok',
        letter: letter({ signed: { at: SIGNED_AT, name: String(body.p_signed_name) } }),
      };
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(result),
    });
  });
  return { calls };
}

/** Browsers with a share sheet would pop it up instead of downloading; tests want the file. */
export async function disableShare(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
  });
}

export async function enterPin(page: Page, pin: string) {
  await page.getByLabel('PIN digit 1 of 4').click();
  await page.keyboard.type(pin);
}

/** Reads the pixel size from a PNG file's header. */
export function pngSize(buffer: Buffer): { width: number; height: number } {
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}
