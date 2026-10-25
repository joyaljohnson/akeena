import type { z } from 'zod';
import {
  checkLinkSchema,
  signSchema,
  unlockSchema,
  type CheckLinkResult,
  type SignResponse,
  type UnlockResponse,
} from './rpcSchemas';

/**
 * The anonymous API. Plain fetch against Supabase's REST endpoint keeps the first load small
 * (the full Supabase client is only needed for the admin area). The key here is the public
 * "publishable" key: it can only call the three functions below.
 */

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

const TIMEOUT_MS = 15000;

function config(): { url: string; key: string } {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new NetworkError('The app is not configured');
  return { url: url.replace(/\/$/, ''), key };
}

async function rpc<S extends z.ZodTypeAny>(
  name: string,
  args: Record<string, unknown>,
  schema: S,
): Promise<z.infer<S>> {
  const { url, key } = config();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      signal: controller.signal,
    });
  } catch {
    throw new NetworkError('Could not reach the server');
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new NetworkError(`Server returned ${res.status}`);
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new NetworkError('Unreadable response');
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new NetworkError('Unexpected response');
  return parsed.data;
}

export const checkLink = (token: string): Promise<CheckLinkResult> =>
  rpc('check_link', { p_token: token }, checkLinkSchema);

/** `countView` is false when resuming after a refresh, so views are not inflated. */
export const unlockLetter = (
  token: string,
  pin: string,
  countView = true,
): Promise<UnlockResponse> =>
  rpc('unlock_letter', { p_token: token, p_pin: pin, p_count_view: countView }, unlockSchema);

export const signLetter = (token: string, pin: string, signedName: string): Promise<SignResponse> =>
  rpc('sign_letter', { p_token: token, p_pin: pin, p_signed_name: signedName }, signSchema);
