import type { PGlite } from '@electric-sql/pglite';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { as, newDb } from './helpers';

type Json = Record<string, unknown>;

let db: PGlite;
const TOKEN = 'a'.repeat(40);
const GUIDE = { heading: 'For the groomsmen', intro: 'Hello', chapters: {} };

const rpc = async (sql: string, params: unknown[]): Promise<Json> =>
  as(db, 'anon', null, async () => {
    const r = await db.query<{ r: Json }>(`select ${sql} as r`, params);
    return r.rows[0]!.r;
  });
const check = (token: string) => rpc('check_guide($1)', [token]);
const unlock = (token: string, pin: string, count = true) =>
  rpc('unlock_guide($1, $2, $3)', [token, pin, count]);
const row = async () =>
  (await db.query<Record<string, unknown>>('select * from groomsmen_guide')).rows[0]!;

beforeEach(async () => {
  db = await newDb();
  await db.query(`update letter_template set content = content || $1::jsonb where id = 1`, [
    JSON.stringify({ chapters: [{ id: 'ch1', title: 'One' }], oath: 'Private oath' }),
  ]);
  await db.query(
    `insert into groomsmen_guide (id, token, pin, content) values (1, $1, '2468', $2::jsonb)`,
    [TOKEN, JSON.stringify(GUIDE)],
  );
});

describe('groomsmen guide: anonymous access', () => {
  it('cannot read or write the table', async () => {
    await expect(
      as(db, 'anon', null, () => db.query('select * from groomsmen_guide')),
    ).rejects.toThrow(/permission denied/);
    await expect(
      as(db, 'anon', null, () => db.query(`update groomsmen_guide set pin = '0000'`)),
    ).rejects.toThrow(/permission denied/);
  });

  it('cannot call the internal PIN check', async () => {
    await expect(
      as(db, 'anon', null, () =>
        db.query(`select private.verify_guide_pin($1, $2)`, [TOKEN, '2468']),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});

describe('check_guide', () => {
  it('says only ok, locked or unavailable', async () => {
    expect(await check(TOKEN)).toEqual({ status: 'ok' });
    expect(await check('b'.repeat(40))).toEqual({ status: 'unavailable' });
    await db.query('update groomsmen_guide set is_active = false');
    expect(await check(TOKEN)).toEqual({ status: 'unavailable' });
  });
});

describe('unlock_guide', () => {
  it('gives nothing but a status for a wrong PIN, and locks on the fifth', async () => {
    for (let left = 4; left >= 1; left--) {
      expect(await unlock(TOKEN, '0000')).toEqual({ status: 'wrong_pin', attempts_left: left });
    }
    const locked = await unlock(TOKEN, '0000');
    expect(locked.status).toBe('locked');
    expect(JSON.stringify(locked)).not.toContain('Hello');
    // The right PIN is refused while locked.
    expect((await unlock(TOKEN, '2468')).status).toBe('locked');
    expect((await check(TOKEN)).status).toBe('locked');
  });

  it('opens with the right PIN and returns the chapters, the font and the page text only', async () => {
    const res = (await unlock(TOKEN, '2468')) as {
      status: string;
      guide: { content: Json; chapters: unknown[]; font: string };
    };
    expect(res.status).toBe('ok');
    expect(res.guide.content).toEqual(GUIDE);
    expect(res.guide.chapters).toEqual([{ id: 'ch1', title: 'One' }]);
    expect(Object.keys(res.guide).sort()).toEqual(['chapters', 'content', 'font']);
    expect(JSON.stringify(res)).not.toContain('Private oath');
  });

  it('counts a view, but not a resume after a refresh', async () => {
    await unlock(TOKEN, '2468');
    expect(await row()).toMatchObject({ open_count: 1 });
    await unlock(TOKEN, '2468', false);
    expect(await row()).toMatchObject({ open_count: 1 });
  });

  it('is unavailable for unknown and switched-off links', async () => {
    expect(await unlock('c'.repeat(40), '2468')).toEqual({ status: 'unavailable' });
    await db.query('update groomsmen_guide set is_active = false');
    expect(await unlock(TOKEN, '2468')).toEqual({ status: 'unavailable' });
  });

  it('treats malformed PINs as wrong tries', async () => {
    expect((await unlock(TOKEN, 'abcd')).status).toBe('wrong_pin');
    expect((await unlock(TOKEN, '12')).status).toBe('wrong_pin');
  });
});

describe('groomsmen guide: admins', () => {
  const adminId = '11111111-1111-1111-1111-111111111111';
  const otherId = '22222222-2222-2222-2222-222222222222';

  beforeEach(async () => {
    await db.query(`insert into auth.users (id, email) values ($1, 'a@x.test'), ($2, 'b@x.test')`, [
      adminId,
      otherId,
    ]);
    await db.query('insert into admins (user_id) values ($1)', [adminId]);
  });

  it('lets an admin read and edit it', async () => {
    const read = await as(db, 'authenticated', adminId, () =>
      db.query('select pin from groomsmen_guide'),
    );
    expect(read.rows).toEqual([{ pin: '2468' }]);
    await as(db, 'authenticated', adminId, () =>
      db.query(`update groomsmen_guide set pin = '1357'`),
    );
    expect(await row()).toMatchObject({ pin: '1357' });
  });

  it('can save through an upsert, which keeps the link and creates one the first time', async () => {
    const upsert = `insert into groomsmen_guide (id, content, pin, is_active)
      values (1, '{"heading":"New"}'::jsonb, '1357', false)
      on conflict (id) do update set content = excluded.content, pin = excluded.pin,
        is_active = excluded.is_active`;
    await as(db, 'authenticated', adminId, () => db.query(upsert));
    expect(await row()).toMatchObject({ token: TOKEN, pin: '1357', is_active: false });

    await db.query('delete from groomsmen_guide');
    await as(db, 'authenticated', adminId, () => db.query(upsert));
    expect(String((await row()).token)).toMatch(/^[0-9a-f]{40}$/);
  });

  it('shows a signed-in non-admin nothing and lets them change nothing', async () => {
    const read = await as(db, 'authenticated', otherId, () =>
      db.query('select * from groomsmen_guide'),
    );
    expect(read.rows).toEqual([]);
    await as(db, 'authenticated', otherId, () =>
      db.query(`update groomsmen_guide set pin = '0000'`),
    );
    expect(await row()).toMatchObject({ pin: '2468' });
  });

  it('allows only one row and four-digit PINs', async () => {
    await expect(
      db.query(`insert into groomsmen_guide (id, pin, content) values (2, '1111', '{}')`),
    ).rejects.toThrow();
    await expect(db.query(`update groomsmen_guide set pin = '12ab'`)).rejects.toThrow();
  });
});

const SEED = join(__dirname, '..', 'guide.private.sql');

describe.skipIf(!existsSync(SEED))('private groomsmen seed', () => {
  it('loads cleanly, is re-runnable, and keeps the link and PIN on a second run', async () => {
    await db.query('delete from groomsmen_guide');
    const sql = readFileSync(SEED, 'utf8');
    await db.exec(sql);
    const first = await row();
    await db.exec(
      sql.replace(
        /values \(1, '[0-9a-f]{40}', '\d{4}'/,
        "values (1, '" + 'e'.repeat(40) + "', '0000'",
      ),
    );
    const second = await row();
    expect(second.token).toBe(first.token);
    expect(second.pin).toBe(first.pin);
    const res = (await unlock(String(first.token), String(first.pin))) as {
      status: string;
      guide: { content: { chapters: Record<string, { looks: unknown[] }> } };
    };
    expect(res.status).toBe('ok');
    expect(Object.keys(res.guide.content.chapters)).toEqual(['ch1', 'ch2', 'ch3', 'ch4']);
  });
});
