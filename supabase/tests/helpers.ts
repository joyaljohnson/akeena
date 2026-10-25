import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS = join(__dirname, '..', 'migrations');

/** What Supabase provides before our migrations run: roles, auth.users, auth.uid(). */
const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  -- Supabase's default privileges: new public objects are open to the API roles.
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

export const TEMPLATE_CONTENT = {
  bride: { firstName: 'Test', signOff: 'With love,' },
  cover: { headlineTemplate: '{name}, would you be my bridesmaid?' },
  duties: { title: 'Duties', items: ['One'] },
  chapters: [],
  closingQuote: 'Quote v1',
  acceptance: { question: 'Will you accept?', yesLabel: 'Yes, I do!' },
  oath: 'Oath',
};

export async function newDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  for (const file of readdirSync(MIGRATIONS).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS, file), 'utf8'));
  }
  await db.query('insert into letter_template (id, content) values (1, $1::jsonb)', [
    JSON.stringify(TEMPLATE_CONTENT),
  ]);
  return db;
}

/** Runs `fn` with the database acting as a Supabase role (and optional signed-in user). */
export async function as<T>(
  db: PGlite,
  role: 'anon' | 'authenticated' | 'postgres',
  userId: string | null,
  fn: () => Promise<T>,
): Promise<T> {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId ?? '']);
  await db.exec(`set role ${role}`);
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  }
}

export type AddedBridesmaid = { id: string; token: string; pin: string };

export async function addBridesmaid(
  db: PGlite,
  fields: {
    name?: string;
    pin?: string;
    note?: string;
    font?: string | null;
    active?: boolean;
  } = {},
): Promise<AddedBridesmaid> {
  const pin = fields.pin ?? String(Math.floor(1000 + Math.random() * 9000));
  const res = await db.query<{ id: string; token: string }>(
    `insert into bridesmaids (name, personal_note, pin, font, is_active)
     values ($1, $2, $3, $4, $5) returning id, token`,
    [
      fields.name ?? 'Riya',
      fields.note ?? 'A note',
      pin,
      fields.font ?? null,
      fields.active ?? true,
    ],
  );
  const row = res.rows[0];
  if (!row) throw new Error('insert failed');
  return { ...row, pin };
}
