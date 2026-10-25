// A pretend backend for design work and tests: no network, nothing saved. Dev-only.
import { isValidPin } from './utils';
import type {
  AdminApi,
  BridesmaidInput,
  BridesmaidRecord,
  SaveResult,
  TemplateRecord,
} from './types';

const DAY = 86_400_000;

function seed(): BridesmaidRecord[] {
  const now = Date.now();
  const mk = (
    n: number,
    name: string,
    pin: string,
    extra: Partial<BridesmaidRecord> = {},
  ): BridesmaidRecord => ({
    id: `id-${n}`,
    token: `token${n}`.padEnd(40, 'a'),
    name,
    personalNote: `Note for ${name}.`,
    font: null,
    pin,
    isActive: true,
    sortOrder: n,
    createdAt: new Date(now - 20 * DAY).toISOString(),
    firstOpenedAt: null,
    lastOpenedAt: null,
    openCount: 0,
    signedAt: null,
    signedName: null,
    signedSnapshot: null,
    ...extra,
  });
  return [
    mk(1, 'Riya', '4821', {
      font: 'allura',
      firstOpenedAt: new Date(now - 6 * DAY).toISOString(),
      lastOpenedAt: new Date(now - 5 * DAY).toISOString(),
      openCount: 3,
      signedAt: new Date(now - 5 * DAY).toISOString(),
      signedName: 'Riya M',
    }),
    mk(2, 'Anjali', '1357', {
      firstOpenedAt: new Date(now - 2 * DAY).toISOString(),
      lastOpenedAt: new Date(now - 1 * DAY).toISOString(),
      openCount: 4,
    }),
    mk(3, 'Meera', '2468'),
    mk(4, 'Divya', '9081', { isActive: false }),
  ];
}

export function createMockApi(template: TemplateRecord): AdminApi {
  let list = seed();
  let tpl = template;
  let signedIn = true;
  const listeners = new Set<(e: string | null) => void>();
  const wait = () => new Promise((r) => setTimeout(r, 150));

  return {
    async getSessionEmail() {
      return signedIn ? 'akeena@example.test' : null;
    },
    onAuthChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    async signIn(email, password) {
      await wait();
      if (password === 'wrong') return 'invalid';
      signedIn = true;
      listeners.forEach((l) => l(email));
      return 'ok';
    },
    async signOut() {
      signedIn = false;
      listeners.forEach((l) => l(null));
    },
    async isAdmin() {
      return true;
    },
    async listBridesmaids() {
      await wait();
      return [...list].sort((a, b) => a.sortOrder - b.sortOrder);
    },
    async getTemplate() {
      await wait();
      return tpl;
    },
    async saveTemplate(t) {
      await wait();
      tpl = t;
    },
    async createBridesmaid(input: BridesmaidInput): Promise<SaveResult> {
      await wait();
      if (!isValidPin(input.pin)) return { ok: false, reason: 'invalid' };
      if (list.some((b) => b.pin === input.pin)) return { ok: false, reason: 'duplicate_pin' };
      const record: BridesmaidRecord = {
        ...seed()[2]!,
        id: `id-${Date.now()}`,
        token: `new${Date.now()}`.padEnd(40, 'b'),
        ...input,
        personalNote: input.personalNote,
        sortOrder: Math.max(0, ...list.map((b) => b.sortOrder)) + 1,
        openCount: 0,
        firstOpenedAt: null,
        lastOpenedAt: null,
        isActive: true,
      };
      list = [...list, record];
      return { ok: true, record };
    },
    async updateBridesmaid(id, input): Promise<SaveResult> {
      await wait();
      const current = list.find((b) => b.id === id);
      if (!current) return { ok: false, reason: 'error' };
      if (current.signedAt) return { ok: false, reason: 'signed' };
      if (list.some((b) => b.id !== id && b.pin === input.pin))
        return { ok: false, reason: 'duplicate_pin' };
      const record = { ...current, ...input };
      list = list.map((b) => (b.id === id ? record : b));
      return { ok: true, record };
    },
    async setActive(id, active) {
      await wait();
      list = list.map((b) => (b.id === id ? { ...b, isActive: active } : b));
    },
    async setOrder(ids) {
      await wait();
      list = list.map((b) => ({ ...b, sortOrder: ids.indexOf(b.id) + 1 }));
    },
    async deleteBridesmaid(id) {
      await wait();
      list = list.filter((b) => b.id !== id);
    },
  };
}
