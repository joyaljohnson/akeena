import type { PGlite } from '@electric-sql/pglite';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { addBridesmaid, as, newDb, TEMPLATE_CONTENT, type AddedBridesmaid } from './helpers';

type Json = Record<string, unknown>;

let db: PGlite;
let b: AddedBridesmaid;

const rpc = async (sql: string, params: unknown[]): Promise<Json> =>
  as(db, 'anon', null, async () => {
    const r = await db.query<{ r: Json }>(`select ${sql} as r`, params);
    return r.rows[0]!.r;
  });

const check = (token: string) => rpc('check_link($1)', [token]);
const unlock = (token: string, pin: string, count = true) =>
  rpc('unlock_letter($1, $2, $3)', [token, pin, count]);
const sign = (token: string, pin: string, name: string) =>
  rpc('sign_letter($1, $2, $3)', [token, pin, name]);

const row = async () =>
  (await db.query<Record<string, unknown>>('select * from bridesmaids where id = $1', [b.id]))
    .rows[0]!;

beforeEach(async () => {
  db = await newDb();
  b = await addBridesmaid(db, { name: 'Riya', pin: '4821', note: 'Hello Riya' });
});

describe('anonymous access', () => {
  it.each(['bridesmaids', 'letter_template', 'admins'])('cannot read %s', async (table) => {
    await expect(as(db, 'anon', null, () => db.query(`select * from ${table}`))).rejects.toThrow(
      /permission denied/,
    );
  });

  it('cannot write to any table', async () => {
    await expect(
      as(db, 'anon', null, () => db.query(`update bridesmaids set name = 'x'`)),
    ).rejects.toThrow(/permission denied/);
    await expect(as(db, 'anon', null, () => db.query(`delete from bridesmaids`))).rejects.toThrow(
      /permission denied/,
    );
  });

  it('cannot call internal functions or the admin check', async () => {
    await expect(
      as(db, 'anon', null, () => db.query(`select private.letter_json($1)`, [b.id])),
    ).rejects.toThrow(/permission denied/);
    await expect(
      as(db, 'anon', null, () => db.query(`select private.verify_pin($1, $2)`, [b.token, b.pin])),
    ).rejects.toThrow(/permission denied/);
    await expect(as(db, 'anon', null, () => db.query(`select public.is_admin()`))).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe('tokens', () => {
  it('are long, URL-safe and unique', async () => {
    const other = await addBridesmaid(db, { name: 'Other' });
    expect(b.token).toMatch(/^[0-9a-f]{40}$/);
    expect(other.token).not.toBe(b.token);
  });
});

describe('check_link', () => {
  it('reveals nothing but a status', async () => {
    expect(await check(b.token)).toEqual({ status: 'ok' });
  });

  it('treats unknown and inactive tokens the same', async () => {
    await db.query('update bridesmaids set is_active = false where id = $1', [b.id]);
    expect(await check(b.token)).toEqual({ status: 'unavailable' });
    expect(await check('nope')).toEqual({ status: 'unavailable' });
  });
});

describe('unlock_letter', () => {
  it('counts down wrong tries, then locks on the fifth', async () => {
    const results: Json[] = [];
    for (let i = 0; i < 5; i++) results.push(await unlock(b.token, '0000'));
    expect(results.slice(0, 4)).toEqual([
      { status: 'wrong_pin', attempts_left: 4 },
      { status: 'wrong_pin', attempts_left: 3 },
      { status: 'wrong_pin', attempts_left: 2 },
      { status: 'wrong_pin', attempts_left: 1 },
    ]);
    expect(results[4]).toMatchObject({ status: 'locked' });
    expect((results[4] as { locked_until: string }).locked_until).toBeTruthy();
    expect(await check(b.token)).toMatchObject({ status: 'locked' });
  });

  it('refuses the right PIN while locked, with no content', async () => {
    for (let i = 0; i < 5; i++) await unlock(b.token, '0000');
    const res = await unlock(b.token, b.pin);
    expect(res).toMatchObject({ status: 'locked' });
    expect(res).not.toHaveProperty('letter');
  });

  it('locks for about 15 minutes, then accepts the right PIN and resets the counter', async () => {
    for (let i = 0; i < 5; i++) await unlock(b.token, '0000');
    const r = await row();
    const minutes = (new Date(r.locked_until as string).getTime() - Date.now()) / 60000;
    expect(minutes).toBeGreaterThan(14);
    expect(minutes).toBeLessThanOrEqual(15);

    await db.query(
      `update bridesmaids set locked_until = now() - interval '1 second' where id = $1`,
      [b.id],
    );
    expect(await unlock(b.token, b.pin)).toMatchObject({ status: 'ok' });
    const after = await row();
    expect(after.failed_attempts).toBe(0);
    expect(after.locked_until).toBeNull();
  });

  it('gives a fresh set of tries after a lock expires', async () => {
    for (let i = 0; i < 5; i++) await unlock(b.token, '0000');
    await db.query(
      `update bridesmaids set locked_until = now() - interval '1 second' where id = $1`,
      [b.id],
    );
    expect(await unlock(b.token, '0000')).toEqual({ status: 'wrong_pin', attempts_left: 4 });
  });

  it('treats malformed PINs as wrong tries', async () => {
    expect(await unlock(b.token, 'abcd')).toEqual({ status: 'wrong_pin', attempts_left: 4 });
    expect(await unlock(b.token, '')).toEqual({ status: 'wrong_pin', attempts_left: 3 });
  });

  it('returns the letter and records the open', async () => {
    const res = (await unlock(b.token, b.pin)) as {
      status: string;
      letter: { name: string; personalNote: string; font: string; content: Json; signed: unknown };
    };
    expect(res.status).toBe('ok');
    expect(res.letter).toMatchObject({
      name: 'Riya',
      personalNote: 'Hello Riya',
      font: 'parisienne',
      content: TEMPLATE_CONTENT,
      signed: null,
    });
    const r = await row();
    expect(r.open_count).toBe(1);
    expect(r.first_opened_at).not.toBeNull();
    expect(r.last_opened_at).not.toBeNull();
  });

  it("uses the bridesmaid's own font when set, else the template default", async () => {
    await db.query(`update bridesmaids set font = 'allura' where id = $1`, [b.id]);
    const res = (await unlock(b.token, b.pin)) as { letter: { font: string } };
    expect(res.letter.font).toBe('allura');
  });

  it('does not count a resume (p_count_view = false)', async () => {
    await unlock(b.token, b.pin);
    await unlock(b.token, b.pin, false);
    expect((await row()).open_count).toBe(1);
    await unlock(b.token, b.pin);
    expect((await row()).open_count).toBe(2);
  });

  it('is unavailable for inactive or unknown links, without touching counters', async () => {
    await db.query('update bridesmaids set is_active = false where id = $1', [b.id]);
    expect(await unlock(b.token, b.pin)).toEqual({ status: 'unavailable' });
    expect(await unlock('nope', '1234')).toEqual({ status: 'unavailable' });
  });
});

describe('sign_letter', () => {
  it('needs the right PIN', async () => {
    expect(await sign(b.token, '0000', 'Riya')).toEqual({ status: 'wrong_pin', attempts_left: 4 });
    expect((await row()).signed_at).toBeNull();
  });

  it('respects the lock', async () => {
    for (let i = 0; i < 5; i++) await unlock(b.token, '0000');
    expect(await sign(b.token, b.pin, 'Riya')).toMatchObject({ status: 'locked' });
    expect((await row()).signed_at).toBeNull();
  });

  it('signs with server time, trims the name and freezes a snapshot', async () => {
    const res = (await sign(b.token, b.pin, '  Riya K  ')) as {
      status: string;
      letter: { signed: { at: string; name: string } };
    };
    expect(res.status).toBe('ok');
    expect(res.letter.signed.name).toBe('Riya K');
    const r = await row();
    expect(r.signed_name).toBe('Riya K');
    expect(r.signed_snapshot).toMatchObject({
      name: 'Riya',
      personalNote: 'Hello Riya',
      content: TEMPLATE_CONTENT,
    });
    const ageMs = Date.now() - new Date(r.signed_at as string).getTime();
    expect(ageMs).toBeLessThan(60_000);
  });

  it('is idempotent: signing again returns the first signature', async () => {
    const first = (await sign(b.token, b.pin, 'Riya')) as { letter: { signed: { at: string } } };
    const second = (await sign(b.token, b.pin, 'Someone Else')) as {
      letter: { signed: { at: string; name: string } };
    };
    expect(second.letter.signed).toEqual({ at: first.letter.signed.at, name: 'Riya' });
  });

  it('rejects empty and over-long names', async () => {
    expect(await sign(b.token, b.pin, '   ')).toEqual({ status: 'invalid_name' });
    expect(await sign(b.token, b.pin, 'x'.repeat(61))).toEqual({ status: 'invalid_name' });
    expect((await row()).signed_at).toBeNull();
  });

  it('strips control characters from the name', async () => {
    await sign(b.token, b.pin, 'Ri\u0007ya\n');
    expect((await row()).signed_name).toBe('Riya');
  });

  it('keeps emoji and long-ish unicode names', async () => {
    await sign(b.token, b.pin, 'Riya 💖 Mathew');
    expect((await row()).signed_name).toBe('Riya 💖 Mathew');
  });
});

describe('signed letters are frozen', () => {
  const NEW_CONTENT = { ...TEMPLATE_CONTENT, closingQuote: 'Quote v2' };

  beforeEach(async () => {
    await sign(b.token, b.pin, 'Riya');
  });

  it('blocks edits to name, note, font and signature', async () => {
    for (const set of [
      `name = 'New'`,
      `personal_note = 'New'`,
      `font = 'allura'`,
      `signed_name = 'New'`,
      `signed_at = null`,
      `signed_snapshot = '{}'::jsonb`,
    ]) {
      await expect(db.query(`update bridesmaids set ${set} where id = $1`, [b.id])).rejects.toThrow(
        /signed and can no longer be edited|check/,
      );
    }
  });

  it('still allows is_active, sort_order and the PIN', async () => {
    await db.query(
      `update bridesmaids set is_active = false, sort_order = 9, pin = '9999' where id = $1`,
      [b.id],
    );
    const r = await row();
    expect(r.is_active).toBe(false);
    expect(r.sort_order).toBe(9);
  });

  it('is not changed by later edits to the shared letter', async () => {
    const other = await addBridesmaid(db, { name: 'Other', pin: '1357' });
    await db.query('update letter_template set content = $1::jsonb where id = 1', [
      JSON.stringify(NEW_CONTENT),
    ]);

    const signedView = (await unlock(b.token, b.pin)) as { letter: { content: Json } };
    expect(signedView.letter.content).toEqual(TEMPLATE_CONTENT);

    const unsignedView = (await unlock(other.token, other.pin)) as { letter: { content: Json } };
    expect(unsignedView.letter.content).toEqual(NEW_CONTENT);
  });

  it('still shows what was signed after the bridesmaid record is deactivated and reactivated', async () => {
    await db.query('update bridesmaids set is_active = false where id = $1', [b.id]);
    expect(await unlock(b.token, b.pin)).toEqual({ status: 'unavailable' });
    await db.query('update bridesmaids set is_active = true where id = $1', [b.id]);
    const res = (await unlock(b.token, b.pin)) as { letter: { signed: { name: string } } };
    expect(res.letter.signed.name).toBe('Riya');
  });
});

describe('constraints', () => {
  it.each(['123', '12345', 'abcd', '12a4', ''])('rejects PIN %j', async (pin) => {
    await expect(addBridesmaid(db, { name: 'X', pin })).rejects.toThrow();
  });

  it('rejects a duplicate PIN', async () => {
    await expect(addBridesmaid(db, { name: 'Dup', pin: '4821' })).rejects.toThrow(
      /unique|duplicate/,
    );
  });

  it('limits the personal note to 600 characters', async () => {
    await addBridesmaid(db, { name: 'Ok', pin: '1111', note: 'a'.repeat(600) });
    await expect(
      addBridesmaid(db, { name: 'Long', pin: '2222', note: 'a'.repeat(601) }),
    ).rejects.toThrow();
  });

  it('only allows the single template row', async () => {
    await expect(
      db.query(`insert into letter_template (id, content) values (2, '{}'::jsonb)`),
    ).rejects.toThrow();
  });
});

describe('admin access', () => {
  const adminId = '11111111-1111-1111-1111-111111111111';
  const otherId = '22222222-2222-2222-2222-222222222222';

  beforeEach(async () => {
    await db.query(`insert into auth.users (id, email) values ($1, 'a@x.test'), ($2, 'b@x.test')`, [
      adminId,
      otherId,
    ]);
    await db.query('insert into admins (user_id) values ($1)', [adminId]);
  });

  it('lets an admin read and manage bridesmaids and the shared letter', async () => {
    const rows = await as(db, 'authenticated', adminId, () =>
      db.query('select name, pin from bridesmaids'),
    );
    expect(rows.rows).toEqual([{ name: 'Riya', pin: '4821' }]);

    await as(db, 'authenticated', adminId, () =>
      db.query(`insert into bridesmaids (name, personal_note, pin) values ('New', 'n', '7777')`),
    );
    await as(db, 'authenticated', adminId, () =>
      db.query(`update letter_template set default_font = 'allura' where id = 1`),
    );
    const t = await as(db, 'authenticated', adminId, () =>
      db.query('select default_font from letter_template'),
    );
    expect(t.rows).toEqual([{ default_font: 'allura' }]);
  });

  it('shows a signed-in non-admin nothing and lets them change nothing', async () => {
    const rows = await as(db, 'authenticated', otherId, () =>
      db.query('select * from bridesmaids'),
    );
    expect(rows.rows).toHaveLength(0);
    const tpl = await as(db, 'authenticated', otherId, () =>
      db.query('select * from letter_template'),
    );
    expect(tpl.rows).toHaveLength(0);

    await expect(
      as(db, 'authenticated', otherId, () =>
        db.query(`insert into bridesmaids (name, personal_note, pin) values ('Evil', 'n', '5555')`),
      ),
    ).rejects.toThrow(/row-level security/);

    await as(db, 'authenticated', otherId, () =>
      db.query(`update bridesmaids set name = 'Hacked'`),
    );
    expect((await row()).name).toBe('Riya');
    await as(db, 'authenticated', otherId, () => db.query('delete from bridesmaids'));
    expect(await row()).toBeTruthy();
  });

  it('cannot add itself to the admin list', async () => {
    await expect(
      as(db, 'authenticated', otherId, () =>
        db.query('insert into admins (user_id) values ($1)', [otherId]),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it('does not let an authenticated user call the internal functions', async () => {
    await expect(
      as(db, 'authenticated', otherId, () => db.query(`select private.letter_json($1)`, [b.id])),
    ).rejects.toThrow(/permission denied/);
  });
});

// Only runs on the machine that has the private seed (it is gitignored).
const SEED = join(__dirname, '..', 'seed.private.sql');
describe.skipIf(!existsSync(SEED))('private seed', () => {
  it('loads cleanly, is re-runnable, and produces a letter the RPCs can serve', async () => {
    const sql = readFileSync(SEED, 'utf8');
    await db.exec(sql);
    await db.exec(sql);
    const res = (await unlock(b.token, b.pin)) as {
      letter: { content: { chapters: unknown[]; duties: { items: unknown[] } } };
    };
    expect(res.letter.content.chapters).toHaveLength(4);
    expect(res.letter.content.duties.items).toHaveLength(6);

    // Non-ASCII characters must survive intact (the seed is ASCII with escapes).
    const quote = (res.letter.content as unknown as { closingQuote: string }).closingQuote;
    expect(quote).toContain(' \u2014 ');
    expect(quote).not.toMatch(/[\u201A\u00C4]/);
    const tpl = await db.query<{ whatsapp_message_template: string }>(
      'select whatsapp_message_template from letter_template',
    );
    expect(tpl.rows[0]!.whatsapp_message_template).toContain('\u{1F48C}');
    expect(tpl.rows[0]!.whatsapp_message_template).toContain('\u2026');
  });
});
